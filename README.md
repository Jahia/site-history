# Site History

Site History is a Jahia module that lists the content history of a whole site in one paginated table in jContent.

The jContent History tab shows the history of one node. This module reads the same core table, `jahia_contenthistory`, and shows every row whose path is the site path or a path below it. The module stores no data of its own.

## Requirements

- Jahia 8.2.2.0 or later.
- The modules `default`, `graphql-dxm-provider` 3.4.0 or later, and `jcontent`. Jahia 8.2.2.0 and later releases ship these three modules.

## Where to find the page

Open jContent on a site, then open the **Additional** accordion and select **Site history**. The page URL has this form:

```
/jahia/jcontent/<siteKey>/<language>/apps/siteHistory
```

## Permissions

A user needs two permissions on the site node, `/sites/<siteKey>`:

| Permission | What it controls |
|---|---|
| `additionalAccordionAccess` | jContent shows the Additional accordion. |
| `viewSiteHistory` | jContent shows the Site history entry, and the GraphQL field returns the rows. |

The GraphQL field checks `viewSiteHistory` on the node it is called on. A user without the permission gets an access-denied error and no rows.

The module adds the permission `viewSiteHistory` under the `site-admin` permission group. The `site-administrator` role holds `site-admin`, and the module grants `viewSiteHistory` to the `server-administrator` role. The jContent History tab of a node keeps its own permission, `viewHistoryTab`, so a user with `viewHistoryTab` alone does not see the Site history.

## Action bar

The action bar under the page title holds the Refresh button and the Clear filters button.

- Refresh loads the total and the rows of the table again, with the same page, sort and filters. The table shows its loader until the rows arrive. When the page on screen is past the last page, the table shows the last page.
- Clear filters removes every filter and returns the table to page 1. The button is disabled while no filter is set.

## Columns

The table has 11 columns and shows the newest row first. A page shows 100 rows, and you can choose 20 or 50 rows instead.

You can sort the table by the Date, User, Property, Action, Path, UUID or Message column. A click on the title of the column sorts the rows, and a second click reverses the order. The table returns to page 1 when the sort changes, and rows with an equal value show the newest row first. The User column sorts by user name, and the Property column sorts by property name. These names can differ from the text in the cell. The table returns to the newest row first after a reload, and when you hide the sorted column. The pager stays at the bottom of the table while you scroll the rows, and a new page opens on its first row.

The column button at the right end of the filter row lists the visible columns and the hidden columns, and a click on a column shows or hides it. The UUID and Message columns are hidden until you show them. The browser keeps the choice in its local storage under the key `siteHistory.columns`, so another browser shows the default columns. The page query skips the fields of a hidden column, so a hidden User, Name, Content type or Property column saves a lookup per row.

| Column | Content |
|---|---|
| Date | The date of the action, in the date format of the UI language. The module formats dates in English, French and German, and it uses English for any other UI language. |
| User | The first name and the last name of the user, or the user name when the names are empty. |
| Name | The display name of the node and its system name. A long name scrolls inside the cell. The cell shows a dash when the node no longer exists or the user cannot read it. |
| Content type | The label of the primary type of the node in the UI language, and its icon, as the lists of jContent show them. A row of a translation node shows the type of its content node. The cell is empty when the node no longer exists or the user cannot read it. |
| Property | The label and the name of the property, on a property row only. |
| Language | The language of a row on a translation node or an i18n property, in upper case, for example `EN`. Other rows show a globe icon. |
| Action | The action as a chip, for example Created, Modified, Published or Accessed. An unknown action shows as plain text. |
| Locate | A link that opens jContent on the node and selects it, like the Locate action of a jContent search. The header of this column is empty. The link resolves the node by its UUID when the pointer rests on it for 150 ms or when it gets the focus. A page load sends no query. A resolved link holds the jContent URL, and a middle click opens it in a new tab. A deleted node shows a disabled icon. |
| Path | The path of the node at the time of the action. A tooltip shows a long path in full. |
| UUID | The identifier of the node. |
| Message | The workspaces of a publication, for example `default;;live`. |

## Filters

The filter row above the table holds the From and To dates, the User filter, the Path filter and the Action filter. A row must match every filter that is set, and the table returns to page 1 when a filter changes.

- User: type user names separated by commas, such as `root, jdoe`, then press Enter or leave the field. The table keeps the rows of these users only. The icon at the right end of the field opens the user picker of jContent, and the picked users are added to the list. A user that you unselect in the picker leaves the list.
- Path: type a path such as `/sites/digitall/home`, then press Enter or leave the field. The table keeps the rows of this node and of every node below it. The icon at the right end of the field opens the editorial picker of jContent, which lists the pages, the content folders and the content items of the site. The picked node sets the path.

The editorial picker does not list the files, so you type the path of a file or of a folder under `/files`.

## GraphQL API

The module adds the field `siteHistory` to the `JCRNode` type. The field returns the rows of the node and of every node below it:

```graphql
query {
    jcr {
        nodeByPath(path: "/sites/digitall") {
            siteHistory {
                totalCount
                entries(offset: 0, limit: 20) {
                    date
                    action
                    path
                    propertyName
                    language
                    userKey
                    message
                }
            }
        }
    }
}
```

- `offset` is 0 or more, and its default is 0. A negative offset returns an error.
- `limit` defaults to 20, and the module clamps it to the range 1 to 100.
- `totalCount` is an exact count of the rows.
- Each SQL query has a timeout of 30 seconds.

`totalCount` and `entries` take an optional `filter` argument of type `InputSiteHistoryFilter`. A row must match every field that is set, and a null or empty field matches every row.

| Field | Rows that match |
|---|---|
| `actions` | The action is one of these values. The list holds at most 20 values. |
| `userKeys` | The user name is one of these values. The module drops a blank value and a duplicate, and a list of more than 100 values returns an error. |
| `fromTimestamp` | The date is at or after this time, in milliseconds since epoch. |
| `beforeTimestamp` | The date is before this time, in milliseconds since epoch. |
| `path` | The path is this path or a path below it. A path outside the node returns an error. A path with `[` or `]` returns an error too. |

```graphql
query ($filter: InputSiteHistoryFilter) {
    jcr {
        nodeByPath(path: "/sites/digitall") {
            siteHistory {
                totalCount(filter: $filter)
                entries(limit: 20, filter: $filter) {
                    date
                    action
                    path
                }
            }
        }
    }
}
```

The variables of this query list the published rows of `/sites/digitall/home` since a date:

```json
{"filter": {"actions": ["published"], "fromTimestamp": 1790805600000, "path": "/sites/digitall/home"}}
```

`entries` takes an optional `sort` argument of type `InputSiteHistorySort`. A null `sort` lists the newest rows first, and rows with an equal value come newest first in every sort.

| Field | Values |
|---|---|
| `field` | `DATE`, `USER`, `ACTION`, `PATH`, `PROPERTY`, `UUID` or `MESSAGE`. `USER` sorts by user name, and `PROPERTY` sorts by property name. |
| `direction` | `ASC` or `DESC`. |

These variables list the rows of the user names in alphabetical order:

```json
{"sort": {"field": "USER", "direction": "ASC"}}
```

## Limits

- The history table holds no node type, so the table cannot sort or filter the rows by content type.
- A moved node keeps the old path on its old rows. Those rows stay listed under the old path.
- The module filters no row by ACL. A user with `viewSiteHistory` on the site sees every row of the site, including the rows of a node that the user cannot read.
- The table includes the `accessed` rows. Jahia writes one `accessed` row on each read of a file, and guest reads count too.
- The module hides the rows of the properties `j:lastPublished` and `j:lastPublishedBy`, and `totalCount` does not count them. A publication writes a row of each property for each published node, and the `published` row of the node stays listed.
- Jahia 8.2.4.0 deletes the rows that are older than 13 months. On Jahia 8.2.3, a purge in December keeps 1 year of rows.
- Jahia does not log the actions of the user `system`. A script that runs as `system`, such as a Groovy script, leaves no row.
- Jahia records the `default` workspace only. An edit made in the `live` workspace leaves no row.
- A site that is deleted and created again with the same key shows the rows of the old site until the purge deletes them.
- When a whole site is published for the first time, Jahia writes a `published` row for the site node only. A node that changes later gets its own `published` row when it is published again.
- No database index covers the path column, the action column or the user column, so a count reads the whole history table. On Jahia 8.2.4 and newer, a count with a date filter reads only the rows of its date range, through the date index.
- A sort on any column except Date reads every row that matches the filters for each page, because no database index covers the other columns. On PostgreSQL, a sort by path also reads the large object of the path of each of these rows.
- Each database sorts text with its own collation. Jahia writes an empty message as an empty string and an empty property as NULL. In ascending order, MariaDB, MySQL and SQL Server put both first. PostgreSQL and Derby put an empty string first and NULL last, so an empty message comes first and an empty property comes last. Oracle stores an empty string as NULL and puts NULL last. On Oracle, a sort by path compares the first 1,000 characters of each path.
- The first page of a site with few rows reads most of the date index. A filter that matches few rows has the same cost on any site. Jahia 8.2.3 and older have no date index.
- The user picker of jContent lists the existing users only. The rows of a deleted user stay in the table, and you type the user name to list them.
- The user column holds the user name without its realm. A site user and a global user with the same user name share their rows.
- MySQL, MariaDB and SQL Server often compare the user names without case. On these databases, `userKeys: ["jdoe"]` also selects the rows of the user `JDoe`.
- The User filter and the Path filter call `window.CE_API.openPicker`, which jContent sets and the Jahia Academy does not document. The two fields hide their picker icon when jContent does not set this function.
- The Locate link reads entries of the jContent registry that the Jahia Academy does not document: the `accordionItem` entries, `jcontent/utils` and the redux action `jcontentGoto`. It selects the node with the redux actions `CM_SET_PREVIEW_SELECTION` before jContent 3.7.0 and `CM_SET_SIDE_PANEL_SELECTION` from 3.7.0.
- A new tab that the Locate link opens shows the folder or the page of the node. A jContent URL holds no selection, so the tab does not select the node.
- The module bundles moonstone 2.21.0 with the scoped stylesheet of moonstone. The build adds the prefix `sitehis` to each hashed class name, such as `sitehis_moonstone-TableRow_cb6f0ca`. The rules of the bundle then match the elements of this module only. The moonstone tokens on `:root` apply while Site history is open, and the build drops any moonstone selector without a prefixed class.
- The page of the module asks for `totalCount` and `entries` in one request. On a site with few rows, or with a filter that matches no row, this request took up to 7.3 seconds.

The table gives the worst time of one GraphQL request with 2,000,000 rows on MariaDB and Jahia 8.2.4. The rows have 5 actions, 10 folders and 200 users, and the date filter covers 24 hours.

| Filter | `totalCount` | `entries(limit: 20)` |
|---|---|---|
| None | 2.2 s | 5.4 s |
| `actions` | 2.0 s | 5.6 s |
| `path` | 2.1 s | 6.2 s |
| `fromTimestamp` and `beforeTimestamp` | 0.17 s | 0.12 s |
| `actions`, the dates and `path` | 0.17 s | 0.11 s |
| `userKeys`, 1 user with rows | 1.5 s | 0.14 s |
| `userKeys`, 5 users with rows | 1.4 s | 0.064 s |
| `userKeys`, 1 user with no row | 1.5 s | 4.4 s |
| `userKeys` and the dates | 0.15 s | 0.091 s |

The `userKeys` rows come from a later run with the same seed. In that run, a request with no filter took 1.5 s for `totalCount` and 4.4 s for `entries(limit: 20)`.

## Database support

The module reads the table with plain JDBC, and it builds one SQL query for each database vendor.

| Database | Support |
|---|---|
| Derby | First-class. The Jahia Docker image and the Cypress CI use Derby. |
| MariaDB | First-class. |
| MySQL | Best effort. |
| PostgreSQL | Best effort. Each query reads every large object of the path column. |
| Oracle | Best effort. |
| Microsoft SQL Server | Best effort. |

## Build

The build needs Java 17, Maven 3, Node 22 and Yarn 4.13.0. The file `mise.toml` pins these versions.

The settings file `.github/maven.settings.xml` reads the Jahia Nexus credentials from 2 environment variables:

```bash
export NEXUS_USERNAME=<your Nexus user>
export NEXUS_PASSWORD=<your Nexus password>
mvn -s .github/maven.settings.xml clean install
```

The build runs Vite and writes the bundle to `target/site-history-<version>.jar`. If your own `~/.m2/settings.xml` already resolves the Jahia repositories, `mvn clean install` is enough.

To check the frontend code without a full build, run these commands:

```bash
yarn install
yarn lint
yarn tsc --noEmit
```

## Deploy

`deploy.sh` builds the module and sends the bundle to the provisioning API of a Jahia server. The script runs `mvn clean install` without the settings file, so your `~/.m2/settings.xml` must resolve the Jahia repositories. Create a file `.env` at the repository root with 3 variables: `JAHIA_URL`, `JAHIA_USER` and `JAHIA_PASS`. Then run this command:

```bash
./deploy.sh prod deploy
```

`./deploy.sh prod test` deploys the bundle and then runs the Cypress suite.

## Tests

- `mvn clean install` runs one JUnit 5 class, `HistorySqlTest`. The class checks the SQL text of each vendor and the escaped LIKE patterns of a site path.
- `tests/` holds the Cypress suite. The suite creates the sites `sh_1`, `shx1` and `sh_10`, and it checks the scope, the pagination, the permission and the page.

To run the Cypress suite against a running Jahia, run these commands:

```bash
cd tests
yarn install
JAHIA_URL=http://localhost:8080 SUPER_USER_PASSWORD=<root password> yarn e2e:ci
```

## License

MIT. The file `LICENSE` holds the license text.
