# MAT · 2010 · Annual · MAT · Q7

- id: mat-2010-mat-question-paper__q07
- course: MAT
- exam: MAT
- subject: math
- year: 2010
- session: Annual
- paper: MAT
- question_number: 7
- paper_id: mat-2010-mat-question-paper
- chapter: 排列组合
- knowledge_point: 排列与组合
- problem_type: 判断顺序和限制并计算方案数
- topic_tags: mat-2010-mat-question-paper__q07

## Text (OCR)

```text
7. For APPLICANTS IN COMPUTER SCIENCE ONLY.

In a game of Cat and Mouse, a cat starts at position 0, a mouse starts at position m
and the mouse’s hole is at position h. Here m and h are integers with 0 < m < h. By
way of example, a starting position is shown below where m = 7 and h = 12.


           Cat                 Mouse            Hole

With each turn of the game, one of the mouse or cat (but not both) advances one position
towards the hole on the condition that the cat is always strictly behind the mouse and
never catches it. The game ends when the mouse reaches the safety of its hole at position
h.

This question is about calculating the number, g (h, m), of diﬀerent sequences of moves
that make a game of Cat and Mouse.

Let C denote a move of the cat and M denote a move of the mouse. Then, for example,
g (3, 1) = 2 as MM and MCM are the only possible games. Also CMCCM is not a
valid game when h = 4 and m = 2 as the mouse would be caught on the fourth turn.

(i) Write down the ﬁve valid games when h = 4 and m = 2.
(ii) Explain why g (h, h −1) = h −1 for h ⩾2.
(iii) Explain why g (h, 2) = g (h, 1) for h ⩾3.

(iv) By considering the possible ﬁrst moves of a game, explain why
         g (h, m) = g (h, m + 1) + g (h −1, m −1)    when 1 < m < h −1.
(v) Below is a table with certain values of g (h, m) ﬁlled in. Complete the remainder of
the table and verify that g (6, 1) = 42.
        m

             5                      5

             4                    4

             3                 3

             2              2

             1            1

                2   3   4   5   6   h


                                     18

19
End of Last Question

20

21

22

23

24
```

## Answer / mark scheme candidates

- [Solutions 2010](https://www.maths.ox.ac.uk/system/files/attachments/websolutions10-2025.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2010-mat-question-paper__q07/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
