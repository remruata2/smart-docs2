import { PrismaClient } from './src/generated/prisma';

const prisma = new PrismaClient();

(async () => {
    const chapter = await prisma.textbookChapter.findUnique({
        where: { id: 13 },
        include: { images: { orderBy: { order: 'asc' } } }
    });

    if (chapter) {
        console.log('=== CHAPTER 13 DATA ===');
        console.log('Title:', chapter.title);
        console.log('');

        // Check for [IMAGE: tags in content
        const imageTags = chapter.content?.match(/\[IMAGE:[^\]]+\]/g) || [];
        console.log('=== IMAGE TAGS IN CONTENT ===');
        console.log('Found', imageTags.length, 'tags:');
        imageTags.forEach((tag: string) => console.log('  ', tag));
        console.log('');

        console.log('=== IMAGES IN DATABASE ===');
        console.log('Found', chapter.images.length, 'images:');
        chapter.images.forEach((img: any) => {
            console.log(`\nImage ${img.id}:`);
            console.log(`  Placement: "${img.placement}"`);
            console.log(`  URL: ${img.url ? 'YES' : 'NO'}`);
            console.log(`  Status: ${img.status}`);
        });

        // Check for mismatches
        console.log('\n=== MATCHING ANALYSIS ===');
        const placements = chapter.images.map((img: any) => img.placement);
        const placementsInTags = imageTags.map((tag: string) => tag.replace('[IMAGE: ', '').replace(']', ''));

        console.log('\nPlacements in DB:', placements);
        console.log('Placements in tags:', placementsInTags);

        const matches = placements.filter((p: string) => {
            return imageTags.some((tag: string) => tag === `[IMAGE: ${p}]`);
        });
        console.log('\nMatching placements:', matches.length, '/', placements.length);
    } else {
        console.log('Chapter 13 not found!');
    }

    await prisma.$disconnect();
})();
