/**
 * Zentrale Relations-Definitionen. Alle relations() liegen hier, damit die
 * Domain-Files keine Cross-Domain-Imports von Tabellen aus anderen Domänen
 * brauchen (was sonst zirkuläre Imports erzeugen würde, sobald zwei Domänen
 * sich gegenseitig referenzieren).
 */
import { relations } from "drizzle-orm";
import { workspaces, users } from "./core";
import {
  projects,
  contracts,
  subcontractors,
  subcontractorCertificates,
  securities,
  nachtraege,
  projectContacts,
} from "./projekte";
import { fristen } from "./fristen";
import { queries } from "./assistent";
import {
  bautagebuchEntries,
  beweisChecklists,
  bautagebuchFotos,
  behinderungen,
} from "./bautagebuch";
import {
  vorgaenge,
  vorgangDocuments,
  vorgangAnalysisSteps,
  vorgangCitations,
  vorgangDrafts,
  vorgangAuditLog,
  vorgangLinks,
} from "./vorgaenge";
import {
  rechnungen,
  rechnungPositionen,
  rechnungAnomalien,
} from "./rechnungen";
import { anzeigen } from "./anzeigen";
import { abnahmen } from "./abnahme";
import { maengel, maengelAnzeigen } from "./maengel";
import { hinschgMeldungen, hinschgMessages } from "./hinschg";
import { lv, lvItems } from "./lv";
import { aufmass, aufmassZeilen } from "./aufmass";
import {
  aufmassPrueferTokens,
  aufmassPrueferAccessLog,
} from "./aufmass-pruefer";
import {
  ausgangsrechnungen,
  ausgangsrechnungPositionen,
  ausgangsrechnungMahnungen,
} from "./ausgangsrechnungen";
import { geraete, geraeteDisposition, geraeteWartung } from "./geraete";
import {
  plaene,
  plaeneVersionen,
  plaeneFreigaben,
  dokumente,
} from "./plaene";

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  fristen: many(fristen),
  queries: many(queries),
  bautagebuchEntries: many(bautagebuchEntries),
  vorgaenge: many(vorgaenge),
  rechnungen: many(rechnungen),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [users.workspaceId],
    references: [workspaces.id],
  }),
  queries: many(queries),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [projects.workspaceId],
    references: [workspaces.id],
  }),
  fristen: many(fristen),
  vorgaenge: many(vorgaenge),
  rechnungen: many(rechnungen),
  contracts: many(contracts),
  subcontractors: many(subcontractors),
  securities: many(securities),
  nachtraege: many(nachtraege),
  contacts: many(projectContacts),
  beweisChecklists: many(beweisChecklists),
  anzeigen: many(anzeigen),
  abnahmen: many(abnahmen),
  lv: one(lv),
  ausgangsrechnungen: many(ausgangsrechnungen),
}));

export const contractsRelations = relations(contracts, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [contracts.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [contracts.projectId],
    references: [projects.id],
  }),
}));

export const subcontractorsRelations = relations(
  subcontractors,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [subcontractors.workspaceId],
      references: [workspaces.id],
    }),
    project: one(projects, {
      fields: [subcontractors.projectId],
      references: [projects.id],
    }),
    certificates: many(subcontractorCertificates),
  })
);

export const subcontractorCertificatesRelations = relations(
  subcontractorCertificates,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [subcontractorCertificates.workspaceId],
      references: [workspaces.id],
    }),
    subcontractor: one(subcontractors, {
      fields: [subcontractorCertificates.subcontractorId],
      references: [subcontractors.id],
    }),
  })
);

export const securitiesRelations = relations(securities, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [securities.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [securities.projectId],
    references: [projects.id],
  }),
  subcontractor: one(subcontractors, {
    fields: [securities.subcontractorId],
    references: [subcontractors.id],
  }),
}));

export const nachtraegeRelations = relations(nachtraege, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [nachtraege.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [nachtraege.projectId],
    references: [projects.id],
  }),
}));

export const projectContactsRelations = relations(projectContacts, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [projectContacts.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [projectContacts.projectId],
    references: [projects.id],
  }),
}));

export const fristenRelations = relations(fristen, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [fristen.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [fristen.projectId],
    references: [projects.id],
  }),
}));

export const queriesRelations = relations(queries, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [queries.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, { fields: [queries.userId], references: [users.id] }),
  project: one(projects, {
    fields: [queries.projectId],
    references: [projects.id],
  }),
}));

export const bautagebuchEntriesRelations = relations(
  bautagebuchEntries,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [bautagebuchEntries.workspaceId],
      references: [workspaces.id],
    }),
    project: one(projects, {
      fields: [bautagebuchEntries.projectId],
      references: [projects.id],
    }),
    author: one(users, {
      fields: [bautagebuchEntries.authorId],
      references: [users.id],
    }),
    fotos: many(bautagebuchFotos),
    behinderungen: many(behinderungen),
  })
);

export const bautagebuchFotosRelations = relations(bautagebuchFotos, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [bautagebuchFotos.workspaceId],
    references: [workspaces.id],
  }),
  eintrag: one(bautagebuchEntries, {
    fields: [bautagebuchFotos.eintragId],
    references: [bautagebuchEntries.id],
  }),
  projekt: one(projects, {
    fields: [bautagebuchFotos.projektId],
    references: [projects.id],
  }),
  uploader: one(users, {
    fields: [bautagebuchFotos.uploadedBy],
    references: [users.id],
  }),
}));

export const behinderungenRelations = relations(behinderungen, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [behinderungen.workspaceId],
    references: [workspaces.id],
  }),
  projekt: one(projects, {
    fields: [behinderungen.projektId],
    references: [projects.id],
  }),
  eintrag: one(bautagebuchEntries, {
    fields: [behinderungen.eintragId],
    references: [bautagebuchEntries.id],
  }),
}));

export const beweisChecklistsRelations = relations(beweisChecklists, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [beweisChecklists.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [beweisChecklists.projectId],
    references: [projects.id],
  }),
}));

export const vorgaengeRelations = relations(vorgaenge, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [vorgaenge.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [vorgaenge.projectId],
    references: [projects.id],
  }),
  createdByUser: one(users, {
    fields: [vorgaenge.createdBy],
    references: [users.id],
    relationName: "vorgang_created_by",
  }),
  assignedToUser: one(users, {
    fields: [vorgaenge.assignedTo],
    references: [users.id],
    relationName: "vorgang_assigned_to",
  }),
  documents: many(vorgangDocuments),
  steps: many(vorgangAnalysisSteps),
  citations: many(vorgangCitations),
  drafts: many(vorgangDrafts),
  auditLog: many(vorgangAuditLog),
  links: many(vorgangLinks),
}));

export const vorgangDocumentsRelations = relations(vorgangDocuments, ({ one }) => ({
  vorgang: one(vorgaenge, {
    fields: [vorgangDocuments.vorgangId],
    references: [vorgaenge.id],
  }),
}));

export const vorgangAnalysisStepsRelations = relations(
  vorgangAnalysisSteps,
  ({ one }) => ({
    vorgang: one(vorgaenge, {
      fields: [vorgangAnalysisSteps.vorgangId],
      references: [vorgaenge.id],
    }),
  })
);

export const vorgangCitationsRelations = relations(vorgangCitations, ({ one }) => ({
  vorgang: one(vorgaenge, {
    fields: [vorgangCitations.vorgangId],
    references: [vorgaenge.id],
  }),
}));

export const vorgangDraftsRelations = relations(vorgangDrafts, ({ one }) => ({
  vorgang: one(vorgaenge, {
    fields: [vorgangDrafts.vorgangId],
    references: [vorgaenge.id],
  }),
}));

export const vorgangAuditLogRelations = relations(vorgangAuditLog, ({ one }) => ({
  vorgang: one(vorgaenge, {
    fields: [vorgangAuditLog.vorgangId],
    references: [vorgaenge.id],
  }),
  actor: one(users, {
    fields: [vorgangAuditLog.actorId],
    references: [users.id],
  }),
}));

export const vorgangLinksRelations = relations(vorgangLinks, ({ one }) => ({
  vorgang: one(vorgaenge, {
    fields: [vorgangLinks.vorgangId],
    references: [vorgaenge.id],
  }),
}));

export const rechnungenRelations = relations(rechnungen, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [rechnungen.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [rechnungen.projectId],
    references: [projects.id],
  }),
  positionen: many(rechnungPositionen),
  anomalien: many(rechnungAnomalien),
}));

export const rechnungPositionenRelations = relations(
  rechnungPositionen,
  ({ one }) => ({
    rechnung: one(rechnungen, {
      fields: [rechnungPositionen.rechnungId],
      references: [rechnungen.id],
    }),
  })
);

export const rechnungAnomalienRelations = relations(
  rechnungAnomalien,
  ({ one }) => ({
    rechnung: one(rechnungen, {
      fields: [rechnungAnomalien.rechnungId],
      references: [rechnungen.id],
    }),
  })
);

export const anzeigenRelations = relations(anzeigen, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [anzeigen.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [anzeigen.projectId],
    references: [projects.id],
  }),
}));

export const abnahmenRelations = relations(abnahmen, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [abnahmen.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [abnahmen.projectId],
    references: [projects.id],
  }),
  maengel: many(maengel),
}));

export const maengelRelations = relations(maengel, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [maengel.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [maengel.projectId],
    references: [projects.id],
  }),
  abnahme: one(abnahmen, {
    fields: [maengel.abnahmeId],
    references: [abnahmen.id],
  }),
  behobenDurchNu: one(subcontractors, {
    fields: [maengel.behobenDurchNuId],
    references: [subcontractors.id],
  }),
  anzeigen: many(maengelAnzeigen),
}));

export const maengelAnzeigenRelations = relations(
  maengelAnzeigen,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [maengelAnzeigen.workspaceId],
      references: [workspaces.id],
    }),
    mangel: one(maengel, {
      fields: [maengelAnzeigen.mangelId],
      references: [maengel.id],
    }),
    anzeigeAnUser: one(users, {
      fields: [maengelAnzeigen.anzeigeAnUserId],
      references: [users.id],
    }),
  })
);

export const hinschgMeldungenRelations = relations(
  hinschgMeldungen,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [hinschgMeldungen.workspaceId],
      references: [workspaces.id],
    }),
    assignedTo: one(users, {
      fields: [hinschgMeldungen.assignedToUserId],
      references: [users.id],
    }),
    messages: many(hinschgMessages),
  })
);

export const hinschgMessagesRelations = relations(hinschgMessages, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [hinschgMessages.workspaceId],
    references: [workspaces.id],
  }),
  meldung: one(hinschgMeldungen, {
    fields: [hinschgMessages.meldungId],
    references: [hinschgMeldungen.id],
  }),
  author: one(users, {
    fields: [hinschgMessages.authorUserId],
    references: [users.id],
  }),
}));

export const lvRelations = relations(lv, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [lv.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [lv.projectId],
    references: [projects.id],
  }),
  items: many(lvItems),
}));

export const lvItemsRelations = relations(lvItems, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [lvItems.workspaceId],
    references: [workspaces.id],
  }),
  lv: one(lv, {
    fields: [lvItems.lvId],
    references: [lv.id],
  }),
  parent: one(lvItems, {
    fields: [lvItems.parentId],
    references: [lvItems.id],
    relationName: "lv_item_parent",
  }),
  children: many(lvItems, { relationName: "lv_item_parent" }),
}));

export const aufmassRelations = relations(aufmass, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [aufmass.workspaceId],
    references: [workspaces.id],
  }),
  project: one(projects, {
    fields: [aufmass.projectId],
    references: [projects.id],
  }),
  lv: one(lv, {
    fields: [aufmass.lvId],
    references: [lv.id],
  }),
  zeilen: many(aufmassZeilen),
}));

export const aufmassZeilenRelations = relations(aufmassZeilen, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [aufmassZeilen.workspaceId],
    references: [workspaces.id],
  }),
  aufmass: one(aufmass, {
    fields: [aufmassZeilen.aufmassId],
    references: [aufmass.id],
  }),
  lvItem: one(lvItems, {
    fields: [aufmassZeilen.lvItemId],
    references: [lvItems.id],
  }),
}));

export const aufmassPrueferTokensRelations = relations(
  aufmassPrueferTokens,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [aufmassPrueferTokens.workspaceId],
      references: [workspaces.id],
    }),
    aufmass: one(aufmass, {
      fields: [aufmassPrueferTokens.aufmassId],
      references: [aufmass.id],
    }),
    createdBy: one(users, {
      fields: [aufmassPrueferTokens.createdByUserId],
      references: [users.id],
    }),
    accessLog: many(aufmassPrueferAccessLog),
  })
);

export const aufmassPrueferAccessLogRelations = relations(
  aufmassPrueferAccessLog,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [aufmassPrueferAccessLog.workspaceId],
      references: [workspaces.id],
    }),
    token: one(aufmassPrueferTokens, {
      fields: [aufmassPrueferAccessLog.tokenId],
      references: [aufmassPrueferTokens.id],
    }),
    aufmassZeile: one(aufmassZeilen, {
      fields: [aufmassPrueferAccessLog.aufmassZeileId],
      references: [aufmassZeilen.id],
    }),
  })
);

export const ausgangsrechnungenRelations = relations(
  ausgangsrechnungen,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [ausgangsrechnungen.workspaceId],
      references: [workspaces.id],
    }),
    project: one(projects, {
      fields: [ausgangsrechnungen.projectId],
      references: [projects.id],
    }),
    lv: one(lv, {
      fields: [ausgangsrechnungen.lvId],
      references: [lv.id],
    }),
    aufmass: one(aufmass, {
      fields: [ausgangsrechnungen.aufmassId],
      references: [aufmass.id],
    }),
    positionen: many(ausgangsrechnungPositionen),
    mahnungen: many(ausgangsrechnungMahnungen),
  })
);

export const ausgangsrechnungMahnungenRelations = relations(
  ausgangsrechnungMahnungen,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [ausgangsrechnungMahnungen.workspaceId],
      references: [workspaces.id],
    }),
    ausgangsrechnung: one(ausgangsrechnungen, {
      fields: [ausgangsrechnungMahnungen.ausgangsrechnungId],
      references: [ausgangsrechnungen.id],
    }),
  })
);

export const ausgangsrechnungPositionenRelations = relations(
  ausgangsrechnungPositionen,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [ausgangsrechnungPositionen.workspaceId],
      references: [workspaces.id],
    }),
    ausgangsrechnung: one(ausgangsrechnungen, {
      fields: [ausgangsrechnungPositionen.ausgangsrechnungId],
      references: [ausgangsrechnungen.id],
    }),
    lvItem: one(lvItems, {
      fields: [ausgangsrechnungPositionen.lvItemId],
      references: [lvItems.id],
    }),
    aufmassZeile: one(aufmassZeilen, {
      fields: [ausgangsrechnungPositionen.aufmassZeileId],
      references: [aufmassZeilen.id],
    }),
  })
);

export const geraeteRelations = relations(geraete, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [geraete.workspaceId],
    references: [workspaces.id],
  }),
  dispositionen: many(geraeteDisposition),
  wartungen: many(geraeteWartung),
}));

export const geraeteDispositionRelations = relations(
  geraeteDisposition,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [geraeteDisposition.workspaceId],
      references: [workspaces.id],
    }),
    geraet: one(geraete, {
      fields: [geraeteDisposition.geraetId],
      references: [geraete.id],
    }),
    projekt: one(projects, {
      fields: [geraeteDisposition.projektId],
      references: [projects.id],
    }),
    polier: one(users, {
      fields: [geraeteDisposition.polierUserId],
      references: [users.id],
    }),
  })
);

export const geraeteWartungRelations = relations(
  geraeteWartung,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [geraeteWartung.workspaceId],
      references: [workspaces.id],
    }),
    geraet: one(geraete, {
      fields: [geraeteWartung.geraetId],
      references: [geraete.id],
    }),
  })
);

export const plaeneRelations = relations(plaene, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [plaene.workspaceId],
    references: [workspaces.id],
  }),
  projekt: one(projects, {
    fields: [plaene.projektId],
    references: [projects.id],
  }),
  versionen: many(plaeneVersionen),
}));

export const plaeneVersionenRelations = relations(
  plaeneVersionen,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [plaeneVersionen.workspaceId],
      references: [workspaces.id],
    }),
    plan: one(plaene, {
      fields: [plaeneVersionen.planId],
      references: [plaene.id],
    }),
    uploader: one(users, {
      fields: [plaeneVersionen.hochgeladenVon],
      references: [users.id],
    }),
    freigaben: many(plaeneFreigaben),
  })
);

export const plaeneFreigabenRelations = relations(
  plaeneFreigaben,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [plaeneFreigaben.workspaceId],
      references: [workspaces.id],
    }),
    version: one(plaeneVersionen, {
      fields: [plaeneFreigaben.planVersionId],
      references: [plaeneVersionen.id],
    }),
    user: one(users, {
      fields: [plaeneFreigaben.freigabeDurchUserId],
      references: [users.id],
    }),
  })
);

export const dokumenteRelations = relations(dokumente, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [dokumente.workspaceId],
    references: [workspaces.id],
  }),
  projekt: one(projects, {
    fields: [dokumente.projektId],
    references: [projects.id],
  }),
  uploader: one(users, {
    fields: [dokumente.hochgeladenVon],
    references: [users.id],
  }),
}));
