# MAT · 2007 · Annual · MAT · Q5

- id: mat-2007-mat-question-paper__q05
- course: MAT
- exam: MAT
- subject: math
- year: 2007
- session: Annual
- paper: MAT
- question_number: 5
- paper_id: mat-2007-mat-question-paper
- topic_tags: mat-2007-mat-question-paper__q05

## Text (OCR)

```text
5. For ALL APPLICANTS.

                                                          0, as follows:Let f (n) be a function deﬁned, for any integer n >
              ⎧
              ⎨     1                    if n = 0,
                  f (n) =    (f (n/2))2   if n > 0 and n is even,
              ⎩
                            2f (n −1)   if n > 0 and n is odd.
(i) What is the value of f(5)?

The recursion depth of f (n) is deﬁned to be the number of other integers m such that
the value of f (m) is calculated whilst computing the value of f (n) . For example, the
recursion depth of f (4) is 3, because the values of f (2) , f (1) , and f (0) need to be
calculated on the way to computing the value of f (4).

(ii) What is the recursion depth of f (5)?

                                                               0, as follows:Now let g (n) be a function, deﬁned for all integers n >
             ⎧
             ⎨      0                      if n = 0,
                 g (n) =    1 + g (n/2)    if n > 0 and n is even,
             ⎩
                          1 + g (n −1)   if n > 0 and n is odd.
(iii) What is g (5)?
              ¡(iv) What is g 2k¢, where k   0 is an integer? Brieﬂy explain your answer.                >
             ¡(v) What is g  2l + 2k¢ where l > k   0 are integers? Brieﬂy explain your answer.                    >

(vi) Explain brieﬂy why the value of g (n) is equal to the recursion depth of f (n).
```

## Answer / mark scheme candidates

- [Solutions 2007](https://www.maths.ox.ac.uk/system/files/attachments/websolutions07.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2007-mat-question-paper__q05/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
