// The filter row is the CollectionBar of Moonstone. It renders no data-sel-role of its own, so the tests select its parts
// by data-filter, data-column, roles and accessible names under the data-sel-role of the bar.
// A chip opens its selector in a dialog at the end of the page, so a filter control exists only while its selector is open.
export const FILTERS = '[data-sel-role="site-history-filters"]';
export const CHIP = 'span[data-filter]';
export const ADD_FILTER = `${FILTERS} button:contains("Add filter")`;
export const ADD_FILTER_ITEMS = 'menu[aria-label="Add filter"] li[data-filter]';
export const ACTION_ITEMS = '[data-sel-role="filter-action"]';
export const PATH_FILTER = '[data-sel-role="filter-path"]';

export const chip = (filter: string): string => `${FILTERS} span[data-filter="${filter}"]`;
export const chipButton = (filter: string): string => `${chip(filter)} button[aria-haspopup="dialog"]`;
export const chipClear = (filter: string): string => `${chip(filter)} button:not([aria-haspopup])`;
export const editor = (filter: string): string => `[role="dialog"][data-filter="${filter}"]`;

export const openEditor = (filter: string) => {
    cy.get(chipButton(filter)).click();
    cy.get(editor(filter)).should('be.visible');
};

// Add filter puts a User or Action chip in the row and opens its selector at once.
export const addFilter = (filter: string) => {
    cy.get(ADD_FILTER).click();
    cy.get(`${ADD_FILTER_ITEMS}[data-filter="${filter}"]`).click();
    cy.get(editor(filter)).should('be.visible');
};

export const closeEditor = (filter: string) => {
    cy.contains(`${editor(filter)} button`, /^Close$/).click();
    cy.get(editor(filter)).should('not.exist');
};

export const expectChip = (filter: string, text: string) => cy.get(chipButton(filter)).should('have.text', text);

// Enter commits the typed path, and the chip shows it once the selector closes.
export const typePath = (path: string) => {
    openEditor('path');
    cy.get(PATH_FILTER).type(`${path}{enter}`);
    closeEditor('path');
    expectChip('path', `Path: ${path}`);
};

// A click on an action toggles it, and the selector stays open for the next action.
export const selectActions = (...labels: string[]) => {
    addFilter('action');
    labels.forEach(label => cy.contains(`${editor('action')} ${ACTION_ITEMS}`, new RegExp(`^${label}$`)).click());
    closeEditor('action');
};
