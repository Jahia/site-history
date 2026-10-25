# site-history Changelog

## 0.3.0

* Changed the filters of the Site history page into chips on a toolbar above the table. Date and Path always show, and Add filter adds User and Action.

## 0.2.0

### New Features

* Added a sort to the Site history table, by the Date, User, Property, Action, Path, UUID or Message column. A click on the title of a column sorts the rows, and a second click reverses the order.

  The GraphQL field `entries` takes a `sort` argument with a `field` and a `direction`.

* The Path filter and the User filter of the Site history page each have a text field with a picker icon at its right end. The icon of the Path filter opens the editorial picker of jContent, and the picked node sets the path. The User filter takes user names separated by commas, such as `root, jdoe`, and its icon adds the users picked in the user picker of jContent.

* Added an action bar under the title of the Site history page. Its Refresh button loads the rows again with the same page, sort and filters, and the Clear filters button moved there from the filter row.

* Added a Content type column to the Site history table. The column shows the label of the primary type of the node in the UI language, and its icon. A row of a translation node shows the type of its content node, and the cell is empty when the node no longer exists.

  The GraphQL type `SiteHistoryEntry` has a field `primaryNodeType` of type `JCRNodeType`.

* The Site history hides the rows of the properties `j:lastPublished` and `j:lastPublishedBy`. A publication writes a row of each property for each published node, and the `published` row of the node stays listed.

* Added the permission `viewSiteHistory` for the Site history page. The `site-administrator` and `server-administrator` roles hold it by default.

  A user who holds only `viewHistoryTab`, the permission of the History tab of a node, does not see the Site history page. To give another role access, grant it `viewSiteHistory`.

### Bug Fixes

* The Action filter of the Site history page keeps its width and height when a user selects several actions. The selected actions stay on one line, and the filter hides the ones that do not fit.

## 0.1.0

* Improved the Site history page: the filters sit in their own row, dates show in full, and long paths open on their end.

* Added filters by action, date range and path to the Site history page.

* Added a column choice to the Site history table. A button at the right end of the filter row lists the columns, and a user shows or hides each one. The browser keeps the choice, and the UUID and Message columns are hidden until the user shows them. The Name column is 300 px wide, and a long name scrolls inside its cell.

* Added a Site history page in jContent that lists every change recorded for the content of a site.

* Added a User filter to the Site history page: it opens the user picker of jContent and lists the rows of the selected users.

* Improved the Site history table: a page shows 100 compact rows by default, and the pager stays in view at the bottom of the table. The Action column follows the Language column, and the date filters come first.
