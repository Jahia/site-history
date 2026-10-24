import {defineConfig} from 'cypress';

export default defineConfig({
    chromeWebSecurity: false,
    defaultCommandTimeout: 30000,
    video: true,
    reporter: 'cypress-multi-reporters',
    reporterOptions: {
        configFile: 'reporter-config.json'
    },
    screenshotsFolder: './results/screenshots',
    videosFolder: './results/videos',
    viewportWidth: 1600,
    viewportHeight: 1000,
    watchForFileChanges: false,
    e2e: {
        setupNodeEvents(on, config) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require('cypress-terminal-report/src/installLogsPrinter')(on);
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            return require('./cypress/plugins/index.js')(on, config);
        },
        specPattern: [
            'cypress/e2e/siteHistory0Setup.cy.ts',
            'cypress/e2e/siteHistoryScope.cy.ts',
            'cypress/e2e/siteHistoryPagination.cy.ts',
            'cypress/e2e/siteHistoryPermission.cy.ts',
            'cypress/e2e/siteHistoryPage.cy.ts',
            'cypress/e2e/siteHistoryFilters.cy.ts',
            'cypress/e2e/siteHistoryFiltersPage.cy.ts',
            'cypress/e2e/siteHistorySort.cy.ts',
            'cypress/e2e/siteHistorySortPage.cy.ts',
            'cypress/e2e/siteHistoryColumns.cy.ts',
            'cypress/e2e/siteHistoryContentType.cy.ts',
            'cypress/e2e/siteHistoryLocate.cy.ts',
            'cypress/e2e/siteHistoryPublication.cy.ts',
            'cypress/e2e/siteHistoryActionBar.cy.ts',
            'cypress/e2e/siteHistoryZTeardown.cy.ts'
        ],
        excludeSpecPattern: '*.ignore.ts',
        baseUrl: process.env.CYPRESS_BASE_URL || process.env.JAHIA_URL || 'http://jahia:8080'
    }
});
