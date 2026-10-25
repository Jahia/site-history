import { Button, ButtonGroup, ChevronDown, Close, Menu, MenuItem } from "@jahia/moonstone";
import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACE } from "../i18n.ts";
import styles from "./SiteHistoryApp.module.css";

export type FilterId = "date" | "path" | "user" | "action";

/** The state of a chip that the filter row owns. */
export type ChipState = Readonly<{ isOpen: boolean; onOpen: () => void; onClose: () => void }>;

type FilterChipProps = ChipState & Readonly<{
  id: FilterId;
  name: string;
  /** The value as text. An empty text gives a dashed chip with no close button. */
  value: string;
  onClear: () => void;
  /** The editor. A function gets the close of the editor, for a button that leaves the editor. */
  children: ReactNode | ((close: () => void) => ReactNode);
}>;

export const FilterChip = ({ id, name, value, isOpen, onOpen, onClose, onClear, children }: FilterChipProps) => {
  const { t } = useTranslation(NAMESPACE);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const label = value ? t("siteHistory.filters.chip", { name, value, interpolation: { escapeValue: false } }) : name;
  const clearLabel = t("siteHistory.filters.clearOne", { name, interpolation: { escapeValue: false } });

  useEffect(() => {
    if (isOpen) {
      editorRef.current?.querySelector<HTMLElement>("input, [tabindex='0']")?.focus({ preventScroll: true });
    }
  }, [isOpen]);

  // Moonstone Button takes no ref, so the chip finds its first button.
  const focusChip = () => anchorRef.current?.querySelector("button")?.focus();

  const close = () => {
    onClose();
    focusChip();
  };

  const clear = () => {
    onClear();
    // A pinned chip changes from a ButtonGroup to one Button, so its button exists after the render only.
    setTimeout(focusChip);
  };

  const editButton = (
      <Button
      variant="outlined"
      className={value ? styles.chipValue : styles.chipEmpty}
      label={label}
      iconEnd={<ChevronDown/>}
      title={value ? label : undefined}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      data-sel-role="filter-chip-edit"
      onClick={() => (isOpen ? close() : onOpen())}
    />
  );

  return (
      <>
          <span ref={anchorRef} className={styles.chip} data-sel-role="filter-chip" data-sel-filter={id}>
              {value ? (
                  <ButtonGroup variant="outlined" color="accent">
                      {editButton}
                      <Button
              icon={<Close/>}
              aria-label={clearLabel}
              title={clearLabel}
              data-sel-role="filter-chip-clear"
              onClick={clear}
            />
                  </ButtonGroup>
        ) : (
          editButton
        )}
          </span>
          {isOpen && (
          <Menu
          isDisplayed
          hasSearch={false}
          anchorEl={anchorRef as MutableRefObject<HTMLElement>}
          data-sel-role="filter-editor"
          data-sel-filter={id}
          onClose={close}
          >
              <div
            ref={editorRef}
            role="dialog"
            aria-label={name}
            onKeyDown={event => {
              if (event.key === "Escape") {
                close();
              }
            }}
              >
                  <MenuItem variant="title" label={name}/>
                  {typeof children === "function" ? children(close) : children}
                  <div className={styles.menuFooter}>
                      <Button
                variant="ghost"
                label={t("siteHistory.filters.close")}
                data-sel-role="filter-editor-close"
                onClick={close}
              />
                  </div>
              </div>
          </Menu>
      )}
      </>
  );
};
