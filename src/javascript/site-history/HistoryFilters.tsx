import {
  AddPerson,
  Button,
  CheckboxGroup,
  CheckboxItem,
  CollectionBar,
  DateTimeInput,
  Filter,
  FolderOpen,
  Input,
  Person,
  Typography,
  type CollectionBarFilter,
  type Temporal,
} from "@jahia/moonstone";
import type { ColumnFiltersState, VisibilityState } from "@tanstack/react-table";
import { useEffect, useState, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { NAMESPACE } from "../i18n.ts";
import { isColumnVisible } from "./columnVisibility.ts";
import { ACTION_CONFIG } from "./columns.tsx";
import { filterValue, parseUserKeys, type DateRange } from "./filters.ts";
import { formatDay } from "./formatDate.ts";
import styles from "./SiteHistoryApp.module.css";

type SetFilter = (id: string, value: unknown) => void;

// The moonstone typings drop the null that DateTimeInput emits when the user clears the field.
const toDay = (value: Temporal.PlainDate | null): string => value?.toString() ?? "";

// CollectionBar puts the name of the filter where its labels hold {{name}}, so i18next keeps that placeholder.
const KEEP_NAME = { name: "{{name}}", interpolation: { escapeValue: false } };

type PickerButtonProps = Readonly<{ icon: ReactElement; label: string; role: string; onClick: () => void }>;

const PickerButton = ({ icon, label, role, onClick }: PickerButtonProps) => (
    <Button variant="outlined" icon={icon} label={label} data-sel-role={role} onClick={onClick}/>
);

type TypedEditorProps = Readonly<{ hint: string; picker?: ReactElement; children: ReactElement }>;

/** The editor of a filter that takes a typed value or a picker choice. */
const TypedEditor = ({ hint, picker, children }: TypedEditorProps) => (
    <div className={`${styles.editorBody} ${styles.typedEditor}`}>
        {children}
        <Typography variant="caption" className={styles.secondary}>
            {hint}
        </Typography>
        {picker}
    </div>
);

type FilterArgs = Readonly<{ filters: ColumnFiltersState; onChange: SetFilter }>;

const usePathFilter = ({ filters, siteKey, sitePath, language, onChange }: FilterArgs & Readonly<{ siteKey: string; sitePath: string; language: string }>): CollectionBarFilter => {
  const { t } = useTranslation(NAMESPACE);
  const openPicker = globalThis.CE_API?.openPicker;
  const path = filterValue<string>(filters, "path") ?? "";
  const [draft, setDraft] = useState(path);
  useEffect(() => setDraft(path), [path]);

  const commit = (value: string) => {
    if (value.trim() !== path) {
      onChange("path", value.trim());
    }
  };

  // The picker dialog opens below the selector, so the selector closes first, which commits the typed path.
  // A filter change returns the table to page 1, so the picked path that is already the filter changes nothing.
  const pick = (close: () => void) => {
    const current = draft.trim();
    close();
    openPicker?.({
      type: "editorial",
      site: siteKey,
      lang: language,
      setValue: ([node]) => node && node.path !== current && onChange("path", node.path),
    });
  };

  return {
    key: "path",
    label: t("siteHistory.columns.path"),
    valueLabel: path,
    isDisplayedByDefault: true,
    onClear: () => onChange("path", ""),
    onClose: () => commit(draft),
    selector: ({ close }) => (
        <TypedEditor
        hint={t("siteHistory.filters.pathHint")}
        picker={
          openPicker && (
          <PickerButton icon={<FolderOpen/>} label={t("siteHistory.filters.pickPath")} role="filter-path-picker" onClick={() => pick(close)}/>
          )
        }
        >
            <Input
          value={draft}
          placeholder={t("siteHistory.filters.path", { example: `${sitePath}/home`, interpolation: { escapeValue: false } })}
          aria-label={t("siteHistory.columns.path")}
          data-sel-role="filter-path"
          onChange={event => setDraft(event.target.value)}
          onKeyUp={event => {
            if (event.key === "Enter") {
              commit(draft);
            }
          }}
          onBlur={() => commit(draft)}
          onClear={() => {
            setDraft("");
            commit("");
          }}
        />
        </TypedEditor>
    ),
  };
};

export type PickedUser = Readonly<{ name: string; uuid: string; path: string }>;

const useUserFilter = ({
  filters,
  pickedUsers,
  siteKey,
  language,
  onChange,
  onPick,
}: FilterArgs & Readonly<{ pickedUsers: PickedUser[]; siteKey: string; language: string; onPick: (users: PickedUser[]) => void }>): CollectionBarFilter => {
  const { t } = useTranslation(NAMESPACE);
  const openPicker = globalThis.CE_API?.openPicker;
  const userKeys = filterValue<string[]>(filters, "user") ?? [];
  // The effect depends on the text, because a missing filter gives a new empty array on every render.
  const text = userKeys.join(", ");
  const [draft, setDraft] = useState(text);
  useEffect(() => setDraft(text), [text]);

  const commit = (keys: string[]) => {
    setDraft(keys.join(", "));
    if (keys.join(", ") !== text) {
      onChange("user", keys);
    }
  };

  // The picker dialog opens below the selector, so the selector closes first and commits the typed keys.
  const pick = (close: () => void) => {
    const keys = parseUserKeys(draft);
    close();
    // A typed key has no node, so the picker preselects only the users that it returned before.
    const preselected = pickedUsers.filter(user => keys.includes(user.name));
    openPicker?.({
      type: "user",
      site: siteKey,
      lang: language,
      isMultiple: true,
      value: preselected.map(({ uuid, path }) => ({ uuid, path })),
      setValue: nodes => {
        onPick(nodes.map(({ name, uuid, path }) => ({ name, uuid, path })));
        // The picked users replace the preselected users, so a user unselected in the picker leaves the list.
        const typed = keys.filter(key => !preselected.some(user => user.name === key));
        const picked = [...new Set([...typed, ...nodes.map(node => node.name)])];
        // A filter change returns the table to page 1, so the same users change nothing.
        if (picked.join(", ") !== keys.join(", ")) {
          onChange("user", picked);
        }
      },
    });
  };

  return {
    key: "user",
    label: t("siteHistory.columns.user"),
    valueLabel: text,
    iconStart: <Person/>,
    onClear: () => onChange("user", []),
    onClose: () => commit(parseUserKeys(draft)),
    selector: ({ close }) => (
        <TypedEditor
        hint={t("siteHistory.filters.userHint")}
        picker={
          openPicker && (
          <PickerButton icon={<AddPerson/>} label={t("siteHistory.filters.pickUsers")} role="filter-user-picker" onClick={() => pick(close)}/>
          )
        }
        >
            <Input
          value={draft}
          placeholder={t("siteHistory.filters.user")}
          aria-label={t("siteHistory.columns.user")}
          data-sel-role="filter-user"
          onChange={event => setDraft(event.target.value)}
          onKeyUp={event => {
            if (event.key === "Enter") {
              commit(parseUserKeys(draft));
            }
          }}
          onBlur={() => commit(parseUserKeys(draft))}
          onClear={() => commit([])}
        />
        </TypedEditor>
    ),
  };
};

const useActionFilter = ({ filters, onChange }: FilterArgs): CollectionBarFilter => {
  const { t } = useTranslation(NAMESPACE);
  const actions = filterValue<string[]>(filters, "action") ?? [];
  const valueLabel = Object.keys(ACTION_CONFIG)
    .filter(action => actions.includes(action))
    .map(action => t(`siteHistory.actions.${action}`))
    .join(", ");

  const toggle = (action: string, isChecked: boolean) =>
    onChange("action", isChecked ? [...actions, action] : actions.filter(a => a !== action));

  return {
    key: "action",
    label: t("siteHistory.columns.action"),
    valueLabel,
    iconStart: <Filter/>,
    onClear: () => onChange("action", []),
    selector: (
        <CheckboxGroup name="site-history-action" aria-label={t("siteHistory.columns.action")}>
            {Object.keys(ACTION_CONFIG).map(action => (
                <CheckboxItem
            key={action}
            value={action}
            label={t(`siteHistory.actions.${action}`)}
            checked={actions.includes(action)}
            data-sel-role="filter-action"
            data-sel-action={action}
            onChange={(_event, _value, isChecked) => toggle(action, isChecked)}
          />
        ))}
        </CheckboxGroup>
    ),
  };
};

const useDateFilter = ({ filters, locale, onChange }: FilterArgs & Readonly<{ locale: string }>): CollectionBarFilter => {
  const { t } = useTranslation(NAMESPACE);
  const [from, to] = filterValue<DateRange>(filters, "date") ?? ["", ""];
  const calendarLabels = {
    todayButton: t("siteHistory.filters.today"),
    nextMonth: t("siteHistory.filters.nextMonth"),
    previousMonth: t("siteHistory.filters.previousMonth"),
  };
  const days = { from: from && formatDay(from, locale), to: to && formatDay(to, locale) };
  let valueLabel = "";
  if (from && to) {
    valueLabel = t("siteHistory.filters.dateBetween", days);
  } else if (from) {
    valueLabel = t("siteHistory.filters.dateSince", days);
  } else if (to) {
    valueLabel = t("siteHistory.filters.dateUntil", days);
  }

  return {
    key: "date",
    label: t("siteHistory.columns.date"),
    valueLabel,
    isDisplayedByDefault: true,
    onClear: () => onChange("date", ["", ""]),
    selector: (
        <div className={`${styles.editorBody} ${styles.dateRange}`}>
            <DateTimeInput
          type="date"
          variant="outlined"
          locale={locale}
          i18n={calendarLabels}
          value={from}
          maxDate={to}
          placeholder={t("siteHistory.filters.dateFrom")}
          aria-label={t("siteHistory.filters.dateFrom")}
          data-sel-role="filter-date-from"
          onChange={(_event, day) => onChange("date", [toDay(day), to])}
        />
            <DateTimeInput
          type="date"
          variant="outlined"
          locale={locale}
          i18n={calendarLabels}
          value={to}
          minDate={from}
          placeholder={t("siteHistory.filters.dateTo")}
          aria-label={t("siteHistory.filters.dateTo")}
          data-sel-role="filter-date-to"
          onChange={(_event, day) => onChange("date", [from, toDay(day)])}
        />
        </div>
    ),
  };
};

type HistoryFiltersProps = Readonly<{
  columns: ReadonlyArray<{ key: string; label: string }>;
  columnVisibility: VisibilityState;
  filters: ColumnFiltersState;
  pickedUsers: PickedUser[];
  siteKey: string;
  sitePath: string;
  language: string;
  locale: string;
  onChange: SetFilter;
  onPickUsers: (users: PickedUser[]) => void;
  onColumnVisibilityChange: (visibility: VisibilityState) => void;
}>;

export const HistoryFilters = ({
  columns,
  columnVisibility,
  filters,
  pickedUsers,
  siteKey,
  sitePath,
  language,
  locale,
  onChange,
  onPickUsers,
  onColumnVisibilityChange,
}: HistoryFiltersProps) => {
  const { t } = useTranslation(NAMESPACE);
  const barFilters = [
    useDateFilter({ filters, locale, onChange }),
    usePathFilter({ filters, siteKey, sitePath, language, onChange }),
    useUserFilter({ filters, pickedUsers, siteKey, language, onChange, onPick: onPickUsers }),
    useActionFilter({ filters, onChange }),
  ];

  return (
      <CollectionBar
      className={styles.filters}
      data-sel-role="site-history-filters"
      filters={barFilters}
      columns={columns}
      visibleColumns={columns.filter(column => isColumnVisible(columnVisibility, column.key)).map(column => column.key)}
      i18n={{
        toolbarLabel: t("siteHistory.filters.bar"),
        addFilter: t("siteHistory.filters.add"),
        filterName: t("siteHistory.filters.chipName", KEEP_NAME),
        clearFilter: t("siteHistory.filters.clearOne", KEEP_NAME),
        closeButton: t("siteHistory.filters.close"),
        columnButton: t("siteHistory.columnChoice.button"),
        visibleColumns: t("siteHistory.columnChoice.visible"),
        hiddenColumns: t("siteHistory.columnChoice.hidden"),
        searchEmptyText: t("siteHistory.columnChoice.noMatch"),
      }}
      onVisibleColumnsChange={visible =>
        onColumnVisibilityChange(Object.fromEntries(columns.map(column => [column.key, visible.includes(column.key)])))}
    />
  );
};
