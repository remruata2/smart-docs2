const { PrismaClient } = require("./src/generated/prisma");

const prisma = new PrismaClient();

async function testSimilarity() {
  try {
    console.log('Testing similarity scores for "tshirts delivered"...');

    // First, let's check if record 7 exists and has a semantic vector
    const record7 = await prisma.$queryRaw`
      SELECT 
        id,
        file_no,
        category,
        title,
        note,
        semantic_vector IS NOT NULL as has_vector
      FROM file_list 
      WHERE id = 7 OR file_no = '7'
    `;

    console.log("Record 7 check:", record7);

    // Check how many records have semantic vectors
    const vectorCount = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM file_list 
      WHERE semantic_vector IS NOT NULL
    `;

    console.log("Records with semantic vectors:", vectorCount[0].count);

    // Get a sample of records with their similarity scores (we'll need to generate embedding manually)
    const sampleRecords = await prisma.$queryRaw`
      SELECT 
        id,
        file_no,
        category,
        title,
        SUBSTRING(note, 1, 100) as note_preview
      FROM file_list 
      WHERE semantic_vector IS NOT NULL
      ORDER BY id
      LIMIT 5
    `;

    console.log("Sample records with vectors:");
    sampleRecords.forEach((record, index) => {
      console.log(`${index + 1}. File ${record.file_no}: ${record.title}`);
      console.log(`   Preview: ${record.note_preview}...`);
      console.log("");
    });
  } catch (error) {
    console.error("Error testing similarity:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testSimilarity();
