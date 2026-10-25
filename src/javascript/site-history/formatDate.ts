import dayjs from "dayjs";
import "dayjs/locale/de";
import "dayjs/locale/en";
import "dayjs/locale/fr";
import localizedFormat from "dayjs/plugin/localizedFormat";

dayjs.extend(localizedFormat);

export const formatDate = (date: string | null | undefined, locale: string): string =>
  date ? dayjs(date).locale(locale).format("lll") : "";

/** A local calendar day "YYYY-MM-DD" in the short date format of the locale, such as 10/1/2026. */
export const formatDay = (day: string, locale: string): string => dayjs(day).locale(locale).format("l");
