// A chip of the filter row opens its editor in a moonstone Menu, so a filter control exists only while its editor is open.
export const FILTERS = '[data-sel-role="site-history-filters"]';
export const CHIP = '[data-sel-role="filter-chip"]';
export const ADD_FILTER = `${FILTERS} [data-sel-role="filter-add"]`;
export const ADD_FILTER_ITEMS = '[data-sel-role="filter-add-menu"] [data-sel-role="filter-add-item"]';
export const ACTION_ITEMS = '[data-sel-role="filter-action"]';
export const PATH_FILTER = '[data-sel-role="filter-path"]';

export const chip = (filter: string): string => `${FILTERS} ${CHIP}[data-sel-filter="${filter}"]`;
export const chipButton = (filter: string): string => `${chip(filter)} [data-sel-role="filter-chip-edit"]`;
export const chipClear = (filter: string): string => `${chip(filter)} [data-sel-role="filter-chip-clear"]`;
export const editor = (filter: string): string => `[data-sel-role="filter-editor"][data-sel-filter="${filter}"]`;

export const openEditor = (filter: string) => {
    cy.get(chipButton(filter)).click();
    cy.get(editor(filter)).should('be.visible');
};

// Add filter puts a User or Action chip in the row and opens its editor at once.
export const addFilter = (filter: string) => {
    cy.get(ADD_FILTER).click();
    cy.get(`${ADD_FILTER_ITEMS}[data-sel-filter="${filter}"]`).click();
    cy.get(editor(filter)).should('be.visible');
};

export const closeEditor = (filter: string) => {
    cy.get(`${editor(filter)} [data-sel-role="filter-editor-close"]`).click();
    cy.get(editor(filter)).should('not.exist');
};

export const expectChip = (filter: string, text: string) => cy.get(chipButton(filter)).should('have.text', text);

// Enter commits the typed path, and the chip shows it once the editor closes.
export const typePath = (path: string) => {
    openEditor('path');
    cy.get(PATH_FILTER).type(`${path}{enter}`);
    closeEditor('path');
    expectChip('path', `Path: ${path}`);
};

// A click on an action toggles it, and the editor stays open for the next action.
export const selectActions = (...labels: string[]) => {
    addFilter('action');
    labels.forEach(label => cy.contains(`${editor('action')} ${ACTION_ITEMS}`, new RegExp(`^${label}$`)).click());
    closeEditor('action');
};
