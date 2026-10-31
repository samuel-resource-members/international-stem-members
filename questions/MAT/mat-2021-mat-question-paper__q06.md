# MAT · 2021 · Annual · MAT · Q6

- id: mat-2021-mat-question-paper__q06
- course: MAT
- exam: MAT
- subject: math
- year: 2021
- session: Annual
- paper: MAT
- question_number: 6
- paper_id: mat-2021-mat-question-paper
- chapter: 微分
- knowledge_point: 驻点与最值
- problem_type: 求驻点并判断极值或变化趋势
- topic_tags: mat-2021-mat-question-paper__q06

## Text (OCR)

```text
6.           ⎧                          ⎫
            ⎨ COMPUTER SCIENCE            ⎬
For APPLICANTS IN                MATHEMATICS & COMPUTER SCIENCE ⎭ONLY.            ⎩
               COMPUTER SCIENCE & PHILOSOPHY

Distinct numbers are arranged in an m×n rectangular table with m rows and n columns
so that in each row the numbers are in increasing order (left to right), and in each column
the numbers are in increasing order (top to bottom). Such a table is called a sorted table
and each location of the table containing a number is called a cell. Two examples of
sorted tables with 3 rows and 4 columns (and thus 3 × 4 = 12 cells) are shown below.

           3   12  33  64                     5   22  53  68
          15  26  37  78                     18  36  67  78
          19  40  51  92                     19  45  81  92


We index the cells of the table with a pair of integers (i, j), with the top-left corner
being (1, 1) and the bottom-right corner being (m, n). Observe that the smallest entry
in a sorted table can only occur in cell (1, 1); however, note that the second smallest
entry can appear either in cell (1, 2), as in the ﬁrst example above, or in cell (2, 1) as in
the second example above.

  (i) (a) Assuming that m, n ⩾3, where in an m×n sorted table can the third-smallest
         entry appear?
     (b) For any k ⩾4 satisfying m, n ⩾k, where in an m × n sorted table can the kth
         smallest entry appear? Justify your answer.

  (ii) Given an m × n sorted table, consider the problem of determining whether a
      particular number y appears in the table.  Outline a procedure that inspects at
    most m + n −1 cells in the table, and that correctly determines whether or not y
     appears in the table. Brieﬂy justify why your procedure terminates correctly in no
    more than m + n −1 steps.
      [Hint: As the ﬁrst step, consider inspecting the top-right cell.]

 (iii) Consider an m × n table, say A, which might not be sorted; an example is shown
     below. Obtain table B from A by re-arranging the entries in each row so that they
     are in sorted order. Then obtain table C from B by re-arranging the entries in
     each column so that they are in sorted order. Fill in tables B and C here:

         A:                   B:                   C:
           33  92  46  24
           25  26  37   8  →          →
           49  40  81  22

 (iv) Show that for any m × n table A, performing the two operations from part (iii)
      results in a sorted table C.



                                     24

25
Turn over

Turn over
If you require additional space please use the pages at the end of the booklet



                            27
```

## Answer / mark scheme candidates

- [Solutions 2021](https://www.maths.ox.ac.uk/system/files/attachments/websolutions21_0.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2021-mat-question-paper__q06/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
