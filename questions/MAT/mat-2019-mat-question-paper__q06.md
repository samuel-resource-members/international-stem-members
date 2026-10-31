# MAT · 2019 · Annual · MAT · Q6

- id: mat-2019-mat-question-paper__q06
- course: MAT
- exam: MAT
- subject: math
- year: 2019
- session: Annual
- paper: MAT
- question_number: 6
- paper_id: mat-2019-mat-question-paper
- chapter: 排列组合
- knowledge_point: 排列与组合
- problem_type: 判断顺序和限制并计算方案数
- topic_tags: mat-2019-mat-question-paper__q06

## Text (OCR)

```text
6.            ⎧                          ⎫
             ⎨ COMPUTER SCIENCE            ⎬
For APPLICANTS IN                MATHEMATICS & COMPUTER SCIENCE ⎭ONLY.             ⎩
               COMPUTER SCIENCE & PHILOSOPHY

A ﬂexadecimal number consists of a sequence of digits, with the rule that the rightmost
digit must be 0 or 1, the digit to the left of it is 0, 1, or 2, the third digit (counting
from the right) must be at most 3, and so on. As usual, we may omit leading digits
if they are zero. We write ﬂexadecimal numbers in angle brackets to distinguish them
from ordinary, decimal numbers. Thus ⟨34101⟩is a ﬂexadecimal number, but ⟨231⟩is
not, because the digit 3 is too big for its place. (If ﬂexadecimal numbers get very long,
we will need ‘digits’ with a value more than 9.)
   The number 1 is represented by ⟨1⟩in ﬂexadecimal. To add 1 to a ﬂexadecimal
number, work from right to left. If the rightmost digit d1 is 0, replace it by 1 and ﬁnish.
Otherwise, replace d1 by 0 and examine the digit d2 to its left, appending a zero at the
left if needed at any stage.  If d2 < 2, then increase it by 1 and ﬁnish, but if d2 = 2,
then replace it by 0, and again move to the left. The process stops when it reaches a
digit that can be increased without becoming too large. Thus, the numbers 1 to 4 are
represented as ⟨1⟩, ⟨10⟩, ⟨11⟩, ⟨20⟩.

   (i) Write the numbers from 5 to 13 in ﬂexadecimal.

  (ii) Describe a workable procedure for converting ﬂexadecimal numbers to decimal,
     and explain why it works. Demonstrate your procedure by converting ⟨1221⟩to
      decimal.

 (iii) Describe a workable procedure for converting decimal numbers to ﬂexadecimal,
     and demonstrate it by converting 255 to ﬂexadecimal.

 (iv) We could add ﬂexadecimal numbers by converting them to decimal, adding the
     decimal numbers and converting the result back again. Describe instead a proce-
     dure for addition that works directly on the digits of two ﬂexadecimal numbers,
     and demonstrate it by performing the addition ⟨1221⟩+ ⟨201⟩.

  (v) Given a ﬂexadecimal number, how could you test whether it is a multiple of 3
     without converting it to decimal?

 (vi)  If the ⟨100000⟩arrangements of the letters abcdef are listed in alphabetical or-
     der and numbered ⟨0⟩: abcdef , ⟨1⟩: abcdfe, ⟨10⟩: abcedf , etc., what arrangement
     appears in position ⟨34101⟩in the list?





                                     16

Turn over
If you require additional space please use the pages at the end of the booklet



                            17
```

## Answer / mark scheme candidates

- [Solutions 2019](https://www.maths.ox.ac.uk/system/files/attachments/websolutions19.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2019-mat-question-paper__q06/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
