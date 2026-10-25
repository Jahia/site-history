import {addNode, publishAndWaitJobEnding, setNodeProperty} from '@jahia/cypress';
import {
    CONTENT_FOLDER_PATH,
    HistoryEntry,
    historyPage,
    MAX_LIMIT,
    nodeUuid,
    waitForAction
} from '../support/siteHistory';

// The rows of a deleted site stay in the history, so each run publishes a text with a path of its own.
const TEXT_NAME = `sh-publication-${Date.now()}`;
const TEXT_PATH = `${CONTENT_FOLDER_PATH}/${TEXT_NAME}`;
// A publication writes a row of each property for each published node.
const HIDDEN_PROPERTIES = ['j:lastPublished', 'j:lastPublishedBy'];

const hiddenRows = (entries: HistoryEntry[]) => entries.filter(entry => HIDDEN_PROPERTIES.includes(entry.propertyName));
const isPublishedRowOf = (uuid: string) => (entry: HistoryEntry) => entry.uuid === uuid && entry.action === 'published';

describe('siteHistory publication rows', () => {
    it('lists the published row of a node and no row of j:lastPublished or j:lastPublishedBy', () => {
        addNode({
            parentPathOrId: CONTENT_FOLDER_PATH,
            name: TEXT_NAME,
            primaryNodeType: 'jnt:text',
            properties: [{name: 'text', value: 'Site history publication text', language: 'en'}]
        });
        // The first publication of a node writes no "published" row for it, and the next one does.
        publishAndWaitJobEnding(TEXT_PATH, ['en']);
        setNodeProperty(TEXT_PATH, 'text', 'Site history publication text, edited before its second publication', 'en');
        publishAndWaitJobEnding(TEXT_PATH, ['en']);
        nodeUuid(TEXT_PATH).then(uuid => {
            waitForAction(TEXT_PATH, [uuid], 'published');

            historyPage(TEXT_PATH, 0, MAX_LIMIT).then(page => {
                expect(page.entries.filter(isPublishedRowOf(uuid)), 'published rows of the text').not.to.be.empty;
                expect(hiddenRows(page.entries), 'rows of j:lastPublished and j:lastPublishedBy').to.deep.equal([]);
                expect(page.entries, 'rows read, against totalCount').to.have.length(page.totalCount);
            });

            // Jahia writes the rows of j:lastPublished and j:lastPublishedBy with the actions added and changed.
            historyPage(TEXT_PATH, 0, MAX_LIMIT, {filter: {actions: ['added', 'changed']}}).then(page => {
                expect(page.entries, 'added and changed rows of the text').not.to.be.empty;
                expect(hiddenRows(page.entries), 'rows of j:lastPublished and j:lastPublishedBy').to.deep.equal([]);
                expect(page.entries, 'rows read, against totalCount').to.have.length(page.totalCount);
            });
        });
    });
});
