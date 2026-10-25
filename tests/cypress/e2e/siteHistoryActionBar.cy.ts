import {addNode} from '@jahia/cypress';
import {expectChip, FILTERS, selectActions, typePath} from '../support/filterChips';
import {
    DEFAULT_COLUMN_LABELS,
    HistoryFilter,
    historyTotal,
    isInScope,
    PAGE_SIZE,
    SITE_KEY,
    SITE_PATH,
    textNodes,
    waitForAction,
    waitForStableTotal
} from '../support/siteHistory';

const PAGE = '[data-sel-role="site-history"]';
const ACTION_BAR = `${PAGE} header`;
const REFRESH = `${ACTION_BAR} [data-sel-role="site-history-refresh"]`;
const CLEAR_FILTERS = `${ACTION_BAR} [data-sel-role="filter-clear"]`;
const TABLE = '[data-sel-role="site-history-table"]';
const HEADERS = `${TABLE} thead th`;
const ROWS = `${TABLE} tbody tr`;
const TOTAL_ITEMS = `${TABLE} [data-testid="pagination-total-items"]`;
const NEXT_PAGE = `${TABLE} [data-testid="pagination-button-next-page"]`;
const ITEMS_PER_PAGE = `${TABLE} [data-testid="pagination-dropdown-items-per-page"]`;
const LOADER = '[data-sel-role="site-history-loader"]';
const LOAD_TIMEOUT = 30000;
const SMALL_PAGE_SIZE = 20;
// The rows of a deleted site stay in the history, so each run creates a folder with a path of its own.
const REFRESH_FOLDER = `sh-refresh-${Date.now()}`;
const REFRESH_FOLDER_PATH = `${SITE_PATH}/contents/${REFRESH_FOLDER}`;
const REFRESH_TEXT_COUNT = 12;
const NEW_TEXT_PATH = `${REFRESH_FOLDER_PATH}/text-new`;
const CREATED_IN_FOLDER: HistoryFilter = {path: REFRESH_FOLDER_PATH, actions: ['created']};

type AddNodeResult = {data?: {jcr?: {addNode?: {uuid: string; addChildrenBatch?: {uuid: string}[]}}}};
type GraphqlOperation = {operationName?: string};

const textsOf = ($elements: JQuery<HTMLElement>) =>
    Cypress.$.makeArray($elements).map(element => (element.textContent ?? '').trim());

const pathCells = `${ROWS} td:nth-child(${DEFAULT_COLUMN_LABELS.indexOf('Path') + 1})`;

const header = (label: string) => cy.contains(HEADERS, new RegExp(`^${label}$`));

const expectTotalItems = (text: string) =>
    cy.get(TOTAL_ITEMS, {timeout: LOAD_TIMEOUT}).invoke('text').should('equal', text);

// The table keeps the previous rows while a query runs, and aria-busy marks that state.
const waitForRows = () => cy.get(TABLE, {timeout: LOAD_TIMEOUT}).should('have.attr', 'aria-busy', 'false');

const selectPageSize = (size: number) => {
    cy.get(`${ITEMS_PER_PAGE} [role="listbox"]`).click();
    cy.contains(`${ITEMS_PER_PAGE} menu [role="option"]`, new RegExp(`^${size}$`)).click();
    cy.get(`${ITEMS_PER_PAGE} [role="listbox"]`).should('have.attr', 'aria-label', String(size));
};

// JContent can send several operations in one request, so the body is an operation or an array of operations.
const delayTableQuery = () =>
    cy.intercept('POST', '**/graphql', request => {
        const operations: GraphqlOperation[] = [].concat(request.body);
        if (operations.some(operation => operation?.operationName === 'siteHistoryTable')) {
            request.on('response', response => {
                response.setDelay(1000);
            });
        }
    });

const addNewText = () =>
    addNode({
        parentPathOrId: REFRESH_FOLDER_PATH,
        name: 'text-new',
        primaryNodeType: 'jnt:text',
        properties: [{name: 'text', value: 'Text created after the page load', language: 'en'}]
    }).then((result: AddNodeResult) =>
        waitForAction(REFRESH_FOLDER_PATH, [result.data?.jcr?.addNode?.uuid], 'created')
    );

// The table lists count rows of text-new, and they end the page.
const expectNewTextRowsLast = (count: number) =>
    cy.get(pathCells).should($cells => {
        const paths = textsOf($cells);
        const isNewText = (path: string) => isInScope(path, NEW_TEXT_PATH);
        expect(paths.filter(isNewText), 'rows of text-new').to.have.length(count);
        expect(paths.slice(paths.length - count).filter(isNewText), 'rows of text-new at the end').to.have.length(
            count
        );
    });

const refreshWithLoader = () => {
    delayTableQuery();
    cy.get(REFRESH).click();
    cy.get(LOADER).should('be.visible');
    cy.get(REFRESH).should('be.disabled');
    cy.get(LOADER, {timeout: LOAD_TIMEOUT}).should('not.exist');
};

describe('Site history action bar', () => {
    before(() => {
        addNode({
            parentPathOrId: `${SITE_PATH}/contents`,
            name: REFRESH_FOLDER,
            primaryNodeType: 'jnt:contentFolder',
            children: textNodes(REFRESH_TEXT_COUNT)
        }).then((result: AddNodeResult) => {
            const folder = result.data?.jcr?.addNode;
            expect(folder?.addChildrenBatch, 'text nodes created under sh-refresh').to.have.length(REFRESH_TEXT_COUNT);
            waitForAction(
                REFRESH_FOLDER_PATH,
                [folder.uuid, ...folder.addChildrenBatch.map(child => child.uuid)],
                'created'
            );
        });
    });

    beforeEach(() => {
        cy.login();
        cy.visit(`/jahia/jcontent/${SITE_KEY}/en/apps/siteHistory`);
        cy.get(ROWS, {timeout: LOAD_TIMEOUT}).should('have.length', PAGE_SIZE);
    });

    // A sort by date from the oldest row puts the new rows at the end, so they land on page 2 of 2.
    // A text node writes two "created" rows, one for the node and one for its translation node.
    it('loads the new rows with the same page, sort and filters when Refresh is clicked', () => {
        historyTotal(SITE_PATH, CREATED_IN_FOLDER).then(created => {
            expect(created, '"created" rows under sh-refresh').to.be.above(SMALL_PAGE_SIZE);
            typePath(REFRESH_FOLDER_PATH);
            selectActions('Created');
            waitForRows();
            selectPageSize(SMALL_PAGE_SIZE);
            header('Date').click();
            header('Date').should('have.attr', 'aria-sort', 'ascending');
            expectTotalItems(`1-${SMALL_PAGE_SIZE} of ${created}`);
            cy.get(NEXT_PAGE).click();
            expectTotalItems(`${SMALL_PAGE_SIZE + 1}-${created} of ${created}`);
            waitForRows();

            addNewText();
            expectNewTextRowsLast(0);

            waitForStableTotal(SITE_PATH, CREATED_IN_FOLDER).then(createdAfter => {
                expect(createdAfter, '"created" rows under sh-refresh after the new text')
                    .to.be.above(created)
                    .and.at.most(2 * SMALL_PAGE_SIZE);
                refreshWithLoader();
                expectTotalItems(`${SMALL_PAGE_SIZE + 1}-${createdAfter} of ${createdAfter}`);
                expectNewTextRowsLast(createdAfter - created);
            });
            expectChip('path', `Path: ${REFRESH_FOLDER_PATH}`);
            expectChip('action', 'Action: Created');
            header('Date').should('have.attr', 'aria-sort', 'ascending');
            cy.get(`${ITEMS_PER_PAGE} [role="listbox"]`).should('have.attr', 'aria-label', String(SMALL_PAGE_SIZE));
            cy.get(REFRESH).should('not.be.disabled');
        });
    });

    it('clears the filters with the button of the action bar', () => {
        cy.get(`${FILTERS} [data-sel-role="filter-clear"]`).should('not.exist');
        cy.get(CLEAR_FILTERS).should('be.visible').and('be.disabled');
        waitForStableTotal(SITE_PATH).then(total => {
            historyTotal(SITE_PATH, {path: REFRESH_FOLDER_PATH}).then(folderTotal => {
                expect(folderTotal, 'rows of sh-refresh').to.be.above(0).and.below(total);
                typePath(REFRESH_FOLDER_PATH);
                cy.get(CLEAR_FILTERS).should('not.be.disabled');
                expectTotalItems(`1-${Math.min(PAGE_SIZE, folderTotal)} of ${folderTotal}`);

                cy.get(CLEAR_FILTERS).click();
                expectTotalItems(`1-${PAGE_SIZE} of ${total}`);
                expectChip('path', 'Path');
                cy.get(CLEAR_FILTERS).should('be.disabled');
            });
        });
    });
});
