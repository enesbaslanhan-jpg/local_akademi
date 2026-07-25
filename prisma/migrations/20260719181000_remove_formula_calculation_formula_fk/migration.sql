PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_FormulaCalculation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "formulaId" TEXT NOT NULL,
    "formulaName" TEXT NOT NULL,
    "inputs" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormulaCalculation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_FormulaCalculation" ("id", "userId", "formulaId", "formulaName", "inputs", "result", "createdAt")
SELECT "id", "userId", "formulaId", "formulaName", "inputs", "result", "createdAt" FROM "FormulaCalculation";

DROP TABLE "FormulaCalculation";
ALTER TABLE "new_FormulaCalculation" RENAME TO "FormulaCalculation";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
