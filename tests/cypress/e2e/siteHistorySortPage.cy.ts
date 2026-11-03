import {
    ALL_COLUMNS_SHOWN,
    COLUMN_LABELS,
    COLUMNS_STORAGE_KEY,
    historyPage,
    HistorySort,
    HistorySortField,
    PAGE_SIZE,
    SITE_KEY,
    SITE_PATH,
    waitForStableTotal
} from '../support/siteHistory';

const TABLE = '[data-sel-role="site-history-table"]';
const HEADERS = `${TABLE} thead th`;
const ROWS = `${TABLE} tbody tr`;
const TOTAL_ITEMS = `${TABLE} [data-testid="pagination-total-items"]`;
const NEXT_PAGE = `${TABLE} [data-testid="pagination-button-next-page"]`;
const PATH_CELLS = `${ROWS} td:nth-child(${COLUMN_LABELS.indexOf('Path') + 1})`;
// The column choice of the CollectionBar: a button and its Menu, which Escape closes
const COLUMN_CHOICE = '[data-sel-role="site-history-filters"] button[aria-label="Choose the columns"]';
const MENU = 'menu[aria-label="Choose the columns"]';
const ITEMS = `${MENU} [role="menuitemcheckbox"]`;
const LOAD_TIMEOUT = 30000;

const SORTABLE_COLUMNS: {label: string; field: HistorySortField}[] = [
    {label: 'Date', field: 'DATE'},
    {label: 'User', field: 'USER'},
    {label: 'Property', field: 'PROPERTY'},
    {label: 'Action', field: 'ACTION'},
    {label: 'Path', field: 'PATH'},
    {label: 'UUID', field: 'UUID'},
    {label: 'Message', field: 'MESSAGE'}
];

const textsOf = ($elements: JQuery<HTMLElement>) =>
    Cypress.$.makeArray($elements).map(element => (element.textContent ?? '').trim());

const header = (label: string) => cy.contains(HEADERS, new RegExp(`^${label}$`));

// The rows of the table are the first page of the GraphQL field with the same sort, so their paths match.
const expectFirstPageOf = (sort: HistorySort) =>
    historyPage(SITE_PATH, 0, PAGE_SIZE, {sort}).then(page => {
        const paths = page.entries.map(entry => entry.path);
        cy.get(PATH_CELLS, {timeout: LOAD_TIMEOUT}).should($cells => {
            expect(textsOf($cells), `Path cells sorted by ${sort.field} ${sort.direction}`).to.deep.equal(paths);
        });
    });

const expectSortedBy = (label: string, direction: 'ascending' | 'descending') => {
    header(label).should('have.attr', 'aria-sort', direction);
    cy.get(`${HEADERS}[aria-sort]`).should('have.length', 1);
    cy.get(TABLE, {timeout: LOAD_TIMEOUT}).should('have.attr', 'aria-busy', 'false');
};

describe('Site history sort', () => {
    let total: number;

    before(() => {
        waitForStableTotal(SITE_PATH).then(count => {
            total = count;
        });
    });

    beforeEach(() => {
        cy.login();
        cy.visit(`/jahia/jcontent/${SITE_KEY}/en/apps/siteHistory`, {
            onBeforeLoad: win => win.localStorage.setItem(COLUMNS_STORAGE_KEY, ALL_COLUMNS_SHOWN)
        });
        cy.get(ROWS, {timeout: LOAD_TIMEOUT}).should('have.length', PAGE_SIZE);
    });

    it('lists the newest rows first, and lets the seven columns of a database field be sorted', () => {
        expectSortedBy('Date', 'descending');
        expectFirstPageOf({field: 'DATE', direction: 'DESC'});
        cy.get(HEADERS).should($cells => {
            const sortable = Cypress.$.makeArray($cells).filter(cell => cell.style.cursor === 'pointer');
            expect(
                sortable.map(cell => (cell.textContent ?? '').trim()),
                'sortable columns'
            ).to.deep.equal(SORTABLE_COLUMNS.map(column => column.label));
        });
    });

    SORTABLE_COLUMNS.forEach(({label, field}) => {
        it(`sorts the table by ${label} when its title is clicked`, () => {
            header(label).click();
            expectSortedBy(label, 'ascending');
            expectFirstPageOf({field, direction: 'ASC'});
        });
    });

    it('reverses the sort on a second click', () => {
        header('User').click();
        expectSortedBy('User', 'ascending');
        header('User').click();
        expectSortedBy('User', 'descending');
        expectFirstPageOf({field: 'USER', direction: 'DESC'});
    });

    it('returns to page 1 when the sort changes', () => {
        cy.get(NEXT_PAGE).click();
        cy.get(TOTAL_ITEMS)
            .invoke('text')
            .should('match', new RegExp(`^${PAGE_SIZE + 1}-`));
        header('Action').click();
        cy.get(TOTAL_ITEMS, {timeout: LOAD_TIMEOUT})
            .invoke('text')
            .should('match', new RegExp(`^1-${PAGE_SIZE} of ${total}$`));
        expectFirstPageOf({field: 'ACTION', direction: 'ASC'});
    });

    it('returns to the newest rows first when the user hides the sorted column', () => {
        header('Message').click();
        expectSortedBy('Message', 'ascending');
        cy.get(COLUMN_CHOICE).click();
        cy.contains(ITEMS, /^Message$/).click();
        cy.focused().type('{esc}');
        cy.get(MENU).should('not.exist');
        expectSortedBy('Date', 'descending');
        expectFirstPageOf({field: 'DATE', direction: 'DESC'});
    });
});
