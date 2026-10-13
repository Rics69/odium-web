import { translator, type Paths } from "./index";
import { ru } from "./ru";
import { ruAdmin } from "./ru-admin";

// The admin's `t` and `tp`: the site's texts and the admin's. Admin code
// takes them from here; the site's `t` does not know admin keys, so admin
// texts never end up in players' pages.
const dictionary = { ...ru, admin: ruAdmin };

export type AdminMessageKey = Paths<typeof dictionary, string>;

export const { t, tp } = translator(dictionary);
