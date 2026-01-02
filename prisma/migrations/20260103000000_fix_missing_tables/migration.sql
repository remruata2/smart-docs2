-- CreateEnum
CREATE TYPE "syllabus_status" AS ENUM ('DRAFT', 'PARSING', 'PARSED', 'ARCHIVED');

-- AlterEnum
ALTER TYPE "textbook_image_type" ADD VALUE 'FLOWCHART';
ALTER TYPE "textbook_image_type" ADD VALUE 'INFOGRAPHIC';
ALTER TYPE "textbook_image_type" ADD VALUE 'MINDMAP';
ALTER TYPE "textbook_image_type" ADD VALUE 'MOLECULAR';
ALTER TYPE "textbook_image_type" ADD VALUE 'ANATOMICAL';
ALTER TYPE "textbook_image_type" ADD VALUE 'EXPERIMENTAL';
ALTER TYPE "textbook_image_type" ADD VALUE 'GEOMETRIC';
ALTER TYPE "textbook_image_type" ADD VALUE 'TIMELINE';
ALTER TYPE "textbook_image_type" ADD VALUE 'COMPARISON';
ALTER TYPE "textbook_image_type" ADD VALUE 'PHOTO';
ALTER TYPE "textbook_image_type" ADD VALUE 'ICON';

-- AlterEnum
ALTER TYPE "user_role" ADD VALUE 'instructor';

-- AlterTable
ALTER TABLE "textbook_images" ADD COLUMN     "caption" VARCHAR(500);

-- AlterTable
ALTER TABLE "textbooks" ADD COLUMN     "subject_id" INTEGER,
ADD COLUMN     "syllabus_id" INTEGER;

-- CreateTable
CREATE TABLE "user_enrollments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "course_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMPTZ(6),
    "enrolled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "board_id" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "is_free" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(10,2),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "instructor_id" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instructors" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "title" VARCHAR(100),
    "social_links" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "instructors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabi" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "board" TEXT NOT NULL DEFAULT 'MBSE',
    "class_level" VARCHAR(20) NOT NULL,
    "stream" VARCHAR(50),
    "subject" VARCHAR(255) NOT NULL,
    "academic_year" VARCHAR(20),
    "raw_text" TEXT,
    "status" "syllabus_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "syllabi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabus_units" (
    "id" SERIAL NOT NULL,
    "syllabus_id" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    "description" TEXT,

    CONSTRAINT "syllabus_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "syllabus_chapters" (
    "id" SERIAL NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "chapter_number" VARCHAR(10) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "order" INTEGER NOT NULL,
    "subtopics" JSONB,

    CONSTRAINT "syllabus_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CourseToSubject" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_CourseToSubject_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "user_enrollments_user_id_idx" ON "user_enrollments"("user_id");

-- CreateIndex
CREATE INDEX "user_enrollments_course_id_idx" ON "user_enrollments"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_enrollments_user_id_course_id_key" ON "user_enrollments"("user_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "instructors_user_id_key" ON "instructors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "syllabus_units_syllabus_id_order_key" ON "syllabus_units"("syllabus_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "syllabus_chapters_unit_id_order_key" ON "syllabus_chapters"("unit_id", "order");

-- CreateIndex
CREATE INDEX "_CourseToSubject_B_index" ON "_CourseToSubject"("B");

-- AddForeignKey
ALTER TABLE "user_enrollments" ADD CONSTRAINT "user_enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_enrollments" ADD CONSTRAINT "user_enrollments_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_board_id_fkey" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "instructors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructors" ADD CONSTRAINT "instructors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_units" ADD CONSTRAINT "syllabus_units_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "syllabi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "syllabus_chapters" ADD CONSTRAINT "syllabus_chapters_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "syllabus_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbooks" ADD CONSTRAINT "textbooks_syllabus_id_fkey" FOREIGN KEY ("syllabus_id") REFERENCES "syllabi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "textbooks" ADD CONSTRAINT "textbooks_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToSubject" ADD CONSTRAINT "_CourseToSubject_A_fkey" FOREIGN KEY ("A") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CourseToSubject" ADD CONSTRAINT "_CourseToSubject_B_fkey" FOREIGN KEY ("B") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
