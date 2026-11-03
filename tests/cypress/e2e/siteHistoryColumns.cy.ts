import {
    DEFAULT_COLUMN_LABELS,
    headerTexts,
    HIDDEN_BY_DEFAULT,
    PAGE_SIZE,
    SITE_KEY,
    SITE_PATH,
    waitForStableTotal
} from '../support/siteHistory';

const TABLE = '[data-sel-role="site-history-table"]';
const HEADERS = `${TABLE} thead th`;
const ROWS = `${TABLE} tbody tr`;
const FILTERS = '[data-sel-role="site-history-filters"]';
// The column choice of the CollectionBar: a button and its Menu, which Escape closes
const COLUMN_CHOICE = 'button[aria-label="Choose the columns"]';
const MENU = 'menu[aria-label="Choose the columns"]';
const ITEMS = `${MENU} [role="menuitemcheckbox"]`;
const TITLES = `${MENU} li:not([role="menuitemcheckbox"])`;
const SEARCH = `${MENU} input[role="searchbox"]`;
const NO_COLUMN = '[data-sel-role="site-history-no-column"]';
const LOAD_TIMEOUT = 30000;
const NAME_WIDTH = 300;
const QUERY = 'siteHistoryTable';

type Operation = {operationName?: string; variables?: Record<string, unknown>};
type OperationResult = {data?: {jcr?: {nodeByPath?: {siteHistory?: {entries?: Record<string, unknown>[]}}}}};

const textsOf = ($elements: JQuery<HTMLElement>) =>
    Cypress.$.makeArray($elements).map(element => (element.textContent ?? '').trim());

const boxOf = (element: Element): DOMRect => element.getBoundingClientRect();

// The GraphQL client can batch operations, so a request body is an operation or a list of operations.
const asList = <T>(body: T | T[]): T[] => (Array.isArray(body) ? body : [body]);

const historyOperation = (body: Operation | Operation[]): number =>
    asList(body).findIndex(operation => operation.operationName === QUERY);

const interceptHistoryQuery = () =>
    cy.intercept('POST', '**/modules/graphql', request => {
        if (historyOperation(request.body) >= 0) {
            request.alias = 'historyQuery';
        }
    });

// Waits for the page query, then gives its variables and its first entry.
const waitForHistoryQuery = (): Cypress.Chainable<{
    variables: Record<string, unknown>;
    entry: Record<string, unknown>;
}> =>
    cy.wait('@historyQuery', {timeout: LOAD_TIMEOUT}).then(({request, response}) => {
        const index = historyOperation(request.body);
        const result = asList<OperationResult>(response.body)[index];
        return {
            variables: asList<Operation>(request.body)[index].variables,
            entry: result.data.jcr.nodeByPath.siteHistory.entries[0]
        };
    });

const openMenu = () => {
    cy.get(`${FILTERS} ${COLUMN_CHOICE}`).click();
    cy.get(MENU).should('be.visible');
};

const closeMenu = () => {
    cy.focused().type('{esc}');
    cy.get(MENU).should('not.exist');
};

const toggleColumn = (label: string) => cy.contains(ITEMS, new RegExp(`^${label}$`)).click();

const expectHeaders = (labels: string[]) =>
    cy.get(HEADERS, {timeout: LOAD_TIMEOUT}).should($cells => {
        expect(textsOf($cells), 'column headers').to.deep.equal(headerTexts(labels));
    });

describe('Site history column choice', () => {
    before(() => {
        waitForStableTotal(SITE_PATH);
    });

    beforeEach(() => {
        interceptHistoryQuery();
        cy.login();
        cy.visit(`/jahia/jcontent/${SITE_KEY}/en/apps/siteHistory`);
        cy.get(ROWS, {timeout: LOAD_TIMEOUT}).should('have.length', PAGE_SIZE);
    });

    it('hides UUID and Message on a first visit and lists them under Hidden columns', () => {
        expectHeaders(DEFAULT_COLUMN_LABELS);
        openMenu();
        cy.get(TITLES).should($titles => {
            expect(textsOf($titles), 'section titles').to.deep.equal(['Visible columns', 'Hidden columns']);
        });
        cy.get(ITEMS).should($items => {
            expect(textsOf($items), 'menu items').to.deep.equal([...DEFAULT_COLUMN_LABELS, ...HIDDEN_BY_DEFAULT]);
            const checked = Cypress.$.makeArray($items).map(item => item.getAttribute('aria-checked'));
            expect(checked, 'checked items').to.deep.equal([
                ...DEFAULT_COLUMN_LABELS.map(() => 'true'),
                ...HIDDEN_BY_DEFAULT.map(() => 'false')
            ]);
        });
        closeMenu();
    });

    it('keeps a hidden column hidden after a reload, and the page query skips its fields', () => {
        waitForHistoryQuery().then(({variables, entry}) => {
            expect(variables.showUser, 'showUser on load').to.equal(true);
            expect(entry, 'first entry on load').to.have.property('userKey');
        });
        openMenu();
        toggleColumn('User');
        expectHeaders(DEFAULT_COLUMN_LABELS.filter(label => label !== 'User'));
        waitForHistoryQuery().then(({variables, entry}) => {
            expect(variables.showUser, 'showUser after the user hid the column').to.equal(false);
            expect(entry, 'first entry without the User column').not.to.have.any.keys('user', 'userKey');
            expect(entry, 'first entry without the User column').to.have.property('nodeName');
        });

        cy.reload();
        waitForHistoryQuery().then(({variables}) => {
            expect(variables.showUser, 'showUser after a reload').to.equal(false);
        });
        expectHeaders(DEFAULT_COLUMN_LABELS.filter(label => label !== 'User'));
        openMenu();
        cy.contains(ITEMS, /^User$/).should('have.attr', 'aria-checked', 'false');
        toggleColumn('User');
        expectHeaders(DEFAULT_COLUMN_LABELS);
    });

    it('finds a column by search, and Enter shows it', () => {
        openMenu();
        cy.get(SEARCH).type('mess');
        cy.get(ITEMS).should($items => {
            expect(textsOf($items), 'items that match "mess"').to.deep.equal(['Message']);
        });
        cy.get(SEARCH).type('{enter}');
        expectHeaders([...DEFAULT_COLUMN_LABELS, 'Message']);
    });

    it('shows a message when every column is hidden, and keeps the column choice', () => {
        openMenu();
        DEFAULT_COLUMN_LABELS.forEach(toggleColumn);
        cy.get(NO_COLUMN).should('be.visible');
        cy.get(TABLE).should('not.exist');
        cy.get(ITEMS).should($items => {
            const checked = Cypress.$.makeArray($items).map(item => item.getAttribute('aria-checked'));
            expect(checked, 'checked items').to.deep.equal($items.toArray().map(() => 'false'));
        });
        closeMenu();
        cy.get(`${FILTERS} ${COLUMN_CHOICE}`).should('be.visible');
    });

    it('gives the Name column 300px and scrolls a long name inside its cell', () => {
        cy.contains(HEADERS, /^Name$/, {timeout: LOAD_TIMEOUT}).should($header => {
            expect(boxOf($header[0]).width, 'width of the Name column').to.be.closeTo(NAME_WIDTH, 1);
        });
        const nameCells = `${ROWS} td:nth-child(${DEFAULT_COLUMN_LABELS.indexOf('Name') + 1})`;
        cy.get(`${nameCells} > div.moonstone-typography`).should($names => {
            expect($names, 'Name cells of existing nodes').not.to.be.empty;
            $names.each((_, name) => {
                const style = name.ownerDocument.defaultView.getComputedStyle(name);
                expect(style.overflowX, `overflow of "${name.textContent}"`).to.equal('auto');
                expect(style.whiteSpace, `wrapping of "${name.textContent}"`).to.equal('nowrap');
                expect(boxOf(name).right, `right edge of "${name.textContent}"`).to.be.at.most(
                    boxOf(name.closest('td')).right
                );
            });
        });
    });
});
