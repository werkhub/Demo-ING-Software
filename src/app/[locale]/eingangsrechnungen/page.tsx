import { redirect } from "next/navigation";

/**
 * Stub-Page — die Eingangsrechnungen werden in /rechnungen verwaltet.
 * /eingangsrechnungen/upload ist die einzige eigenständige Sub-Route
 * (XML-Import). Ein Aufruf von /eingangsrechnungen leitet auf die
 * konsolidierte Liste in /rechnungen um.
 */
export default function EingangsrechnungenIndex(): never {
  redirect("/rechnungen");
}
