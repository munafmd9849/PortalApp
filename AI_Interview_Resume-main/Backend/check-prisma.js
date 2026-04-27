const { Prisma } = require("@prisma/client");

console.log("InterviewReport models fields:");
// This is internal but helps debug
try {
  const dmmf = Prisma.dmmf;
  const model = dmmf.datamodel.models.find(m => m.name === "InterviewReport");
  console.log(model.fields.map(f => f.name));
} catch (e) {
  console.log("Could not access DMMF:", e.message);
}
