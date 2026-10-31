# Question bank — how an AI should read it

Repository: <https://github.com/samuel-resource-members/international-stem-members>.

Everything is reachable through small files. Follow the links level by level; do not download the whole repository unless your runtime needs a local clone.

## 1. Course index

<https://raw.githubusercontent.com/samuel-resource-members/international-stem-members/main/catalog/index.json>

One entry per course: `course_id`, `subject`, `question_count`, `paper_count`, `years`, `classified` (questions that already carry a `problem_type`), and `file` — the course file to open next.

## 2. Course file → papers

`catalog/courses/<course_id>.json`

Lists every paper (or group) in the course with `year`, `session`, `paper`, `variant`, `question_count`, `chapters`, and `file` — the paper file to open next. `questions_dir` is the folder that holds one Markdown file per question.

## 3. Paper file → questions

`catalog/papers/<paper>.json`

Every question of that paper as a full record: `id`, `question_number`, `chapter`, `knowledge_point`, `problem_type`, `topic_tags`, `search_text` (OCR text), `display` (LaTeX statement when available), `answer_candidates` (mark-scheme or solution links when known), `files` (resolved download URLs, see §5) and `question_file` (the Markdown file for that single question). Long papers are split into `…--part01`, `…--part02`.

## 4. Question file

`questions/<course_id>/<question_id>.md`

One question: metadata, OCR text in a fenced block, answer candidates, and the source files with exact download URLs. This is the smallest unit; read it when you need one question only.

## 5. Original PDF, assets, and mark schemes

Each question lists its stored files. A stored file lives inside a content-addressed shard ZIP in the `resources` release:

`https://github.com/samuel-resource-members/international-stem-members/releases/download/resources/<shard>.zip`

Download the shard (35–100 MB), verify its SHA-256 if you can, and extract only the listed member path. Some courses ship as one package ZIP under another release tag (`amc`, `igcse-physics`, `igcse-combined-science`, `subject-resources`); the question file gives the exact URL. Figures are inside the question PDF or the paper's assets ZIP.

Whole-library machine indexes: `data/questions.json` (54 MB) and `data/pdf-store.json` (20 MB). Only programs that clone or stream the repository should use them; `scripts/member_download.py` shows how a program materialises files from the shards.

## Reading rules

- Keep the original wording, answer choices, units, notation, and diagrams.
- `search_text` is OCR. Check it against the PDF whenever formulas, subscripts, Greek letters, chemical notation, or labels matter. 535 questions have no OCR text — use the PDF.
- Empty `chapter`, `knowledge_point`, or `problem_type` means not yet classified; it does not mean the question has no type.
- Exam questions and marking materials remain the copyright of their owners; use them for teaching preparation only.
