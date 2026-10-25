import { Add, Button, Filter, Menu, MenuItem, Person } from "@jahia/moonstone";
import { useRef, useState, type MutableRefObject, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACE } from "../i18n.ts";
import type { FilterId } from "./FilterChip.tsx";
import styles from "./SiteHistoryApp.module.css";

const ICONS: Partial<Record<FilterId, ReactElement>> = { user: <Person/>, action: <Filter/> };

type AddFilterProps = Readonly<{
  /** The filters that are not in the row. */
  filters: ReadonlyArray<FilterId>;
  onAdd: (id: FilterId) => void;
}>;

export const AddFilter = ({ filters, onAdd }: AddFilterProps) => {
  const { t } = useTranslation(NAMESPACE);
  const [isOpen, setIsOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);

  const add = (id: FilterId) => {
    setIsOpen(false);
    onAdd(id);
  };

  return (
      <>
          <span ref={anchorRef} className={styles.chip}>
              <Button
          variant="ghost"
          icon={<Add/>}
          label={t("siteHistory.filters.add")}
          isDisabled={filters.length === 0}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          data-sel-role="filter-add"
          onClick={() => setIsOpen(!isOpen)}
        />
          </span>
          <Menu
        isDisplayed={isOpen}
        hasSearch={false}
        anchorEl={anchorRef as MutableRefObject<HTMLElement>}
        data-sel-role="filter-add-menu"
        onClose={() => setIsOpen(false)}
          >
              {filters.map(id => (
                  <MenuItem
            key={id}
            tabIndex={0}
            label={t(`siteHistory.columns.${id}`)}
            iconStart={ICONS[id]}
            data-sel-role="filter-add-item"
            data-sel-filter={id}
            onClick={() => add(id)}
            onKeyUp={event => {
              if (event.key === "Enter" || event.key === " ") {
                add(id);
              }
            }}
          />
        ))}
          </Menu>
      </>
  );
};
