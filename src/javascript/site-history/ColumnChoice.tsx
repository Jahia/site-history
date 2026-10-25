import { Button, CheckboxChecked, CheckboxUnchecked, Menu, MenuItem, ViewColumn } from "@jahia/moonstone";
import type { VisibilityState } from "@tanstack/react-table";
import { useRef, useState, type MutableRefObject } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACE } from "../i18n.ts";
import { isColumnVisible } from "./columnVisibility.ts";
import styles from "./SiteHistoryApp.module.css";

type ChoosableColumn = Readonly<{ key: string; label: string }>;

type ColumnChoiceProps = Readonly<{
  columns: ReadonlyArray<ChoosableColumn>;
  visibility: VisibilityState;
  onChange: (visibility: VisibilityState) => void;
}>;

const ANCHOR_ORIGIN = { horizontal: "right", vertical: "bottom" } as const;
const TRANSFORM_ORIGIN = { horizontal: "right", vertical: "top" } as const;

export const ColumnChoice = ({ columns, visibility, onChange }: ColumnChoiceProps) => {
  const { t } = useTranslation(NAMESPACE);
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const item = (column: ChoosableColumn, isVisible: boolean) => {
    const toggle = () => onChange({ ...visibility, [column.key]: !isVisible });
    return (
        <MenuItem
        key={column.key}
        role="menuitemcheckbox"
        aria-checked={isVisible}
        tabIndex={0}
        label={column.label}
        iconStart={isVisible ? <CheckboxChecked color="blue"/> : <CheckboxUnchecked/>}
        data-sel-role="column-choice-item"
        data-sel-column={column.key}
        onClick={toggle}
        onKeyUp={event => {
          if (event.key === "Enter" || event.key === " ") {
            toggle();
          }
        }}
      />
    );
  };

  const section = (title: string, role: string, sectionColumns: ChoosableColumn[], isVisible: boolean) =>
    sectionColumns.length === 0
      ? []
      : [
          <MenuItem key={role} variant="title" label={title} data-sel-role={role}/>,
          ...sectionColumns.map(column => item(column, isVisible)),
        ];

  // Menu filters a flat list of children by their label, so the sections stay flat.
  const children = [
    ...section(
      t("siteHistory.columnChoice.visible"),
      "column-choice-visible",
      columns.filter(column => isColumnVisible(visibility, column.key)),
      true,
    ),
    ...section(
      t("siteHistory.columnChoice.hidden"),
      "column-choice-hidden",
      columns.filter(column => !isColumnVisible(visibility, column.key)),
      false,
    ),
      <div key="footer" className={styles.menuFooter}>
          <Button
        variant="ghost"
        label={t("siteHistory.columnChoice.close")}
        data-sel-role="column-choice-close"
        onClick={() => setIsOpen(false)}
      />
      </div>,
  ];

  return (
      <>
          <span ref={anchorRef} className={styles.columnChoice}>
              <Button
          variant="ghost"
          icon={<ViewColumn/>}
          aria-label={t("siteHistory.columnChoice.button")}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          title={t("siteHistory.columnChoice.button")}
          data-sel-role="column-choice"
          onClick={() => setIsOpen(!isOpen)}
        />
          </span>
          <Menu
        hasSearch
        isDisplayed={isOpen}
        anchorEl={anchorRef as MutableRefObject<HTMLElement>}
        anchorElOrigin={ANCHOR_ORIGIN}
        transformElOrigin={TRANSFORM_ORIGIN}
        minWidth="200px"
        searchEmptyText={t("siteHistory.columnChoice.noMatch")}
        data-sel-role="column-choice-menu"
        onClose={() => setIsOpen(false)}
          >
              {children}
          </Menu>
      </>
  );
};
