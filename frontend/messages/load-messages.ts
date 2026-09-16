import enAction from "./en/action.json";
import enApp from "./en/app.json";
import enChrome from "./en/chrome.json";
import enCol from "./en/col.json";
import enCrud from "./en/crud.json";
import enError from "./en/error.json";
import enForm from "./en/form.json";
import enPageAuth from "./en/page-auth.json";
import enPageSetting from "./en/page-setting.json";
import enPageLocation from "./en/page-location.json";
import enPageSupplier from "./en/page-supplier.json";
import enPageSystem from "./en/page-system.json";
import enSupplier from "./en/supplier.json";
import enUser from "./en/user.json";
import thAction from "./th/action.json";
import thApp from "./th/app.json";
import thChrome from "./th/chrome.json";
import thCol from "./th/col.json";
import thCrud from "./th/crud.json";
import thError from "./th/error.json";
import thForm from "./th/form.json";
import thPageAuth from "./th/page-auth.json";
import thPageSetting from "./th/page-setting.json";
import thPageLocation from "./th/page-location.json";
import thPageSupplier from "./th/page-supplier.json";
import thPageSystem from "./th/page-system.json";
import thSupplier from "./th/supplier.json";
import thUser from "./th/user.json";

export type AppLocale = "en" | "th";

type MessageTree = Record<string, unknown>;

function deepMerge(base: MessageTree, patch: MessageTree): MessageTree {
  const out: MessageTree = { ...base };
  for (const key of Object.keys(patch)) {
    const a = out[key];
    const b = patch[key];
    if (
      a !== null &&
      b !== null &&
      typeof a === "object" &&
      typeof b === "object" &&
      !Array.isArray(a) &&
      !Array.isArray(b)
    ) {
      out[key] = deepMerge(a as MessageTree, b as MessageTree);
    } else {
      out[key] = b;
    }
  }
  return out;
}

const FRAGMENTS: MessageTree[] = [
  thApp,
  thChrome,
  thForm,
  thCrud,
  thCol,
  thError,
  thAction,
  thPageAuth,
  thPageSystem,
  thPageSetting,
  thPageLocation,
  thPageSupplier,
  thSupplier,
  thUser,
];

const FRAGMENTS_EN: MessageTree[] = [
  enApp,
  enChrome,
  enForm,
  enCrud,
  enCol,
  enError,
  enAction,
  enPageAuth,
  enPageSystem,
  enPageSetting,
  enPageLocation,
  enPageSupplier,
  enSupplier,
  enUser,
];

function mergeFragments(fragments: MessageTree[]): MessageTree {
  return fragments.reduce((acc, part) => deepMerge(acc, part), {});
}

const MESSAGES: Record<AppLocale, MessageTree> = {
  th: mergeFragments(FRAGMENTS),
  en: mergeFragments(FRAGMENTS_EN),
};

export function loadMessages(locale: AppLocale): MessageTree {
  return MESSAGES[locale];
}
