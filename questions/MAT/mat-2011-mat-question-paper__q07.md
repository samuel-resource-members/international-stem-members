# MAT · 2011 · Annual · MAT · Q7

- id: mat-2011-mat-question-paper__q07
- course: MAT
- exam: MAT
- subject: math
- year: 2011
- session: Annual
- paper: MAT
- question_number: 7
- paper_id: mat-2011-mat-question-paper
- chapter: 排列组合
- knowledge_point: 排列与组合
- problem_type: 判断顺序和限制并计算方案数
- topic_tags: mat-2011-mat-question-paper__q07

## Text (OCR)

```text
7.
              COMPUTER SCIENCE
For APPLICANTS IN                                   ONLY.
              COMPUTER SCIENCE & PHILOSOPHY

Alice and Bob have a large bag of coins which they use to play a game called HT-2. In
this game, Alice and Bob take turns placing one coin at a time on the table, each to the
right of the previous one; thus they build a row of coins that grows to the right. Alice
always places the ﬁrst coin. Each coin is placed head-up (H) or tail-up (T), and cannot
be ﬂipped or moved once it has been placed.
  A player loses the game if he or she places a coin that results in two adjacent coins
having the same pattern of heads and tails as another adjacent pair somewhere in the
row (reading a pattern from left to right).  For example, Bob has lost this game by
producing a second instance of HT (where a and b denote coins placed by Alice and Bob
respectively):
                           a   b   a   b  a   b
                 H H  T  T H  T

and Alice has lost this game by producing a second instance of TT (overlapping pairs
can count as repeats):
                              a   b  a   b  a
                          T H  T  T  T

(i) What is the smallest number of coins that might be placed in a game of HT-2
(including the ﬁnal coin that causes a player to lose)? What is the largest number?
Justify each answer.

(ii) Bob can always win a game of HT-2 by adopting a particular strategy. Describe the
strategy.

For any positive integer n, there is a game HT-n with the same rules as HT-2, except
that the game is lost by a player who creates an unbroken sequence of n heads and tails
that appears elsewhere in the row. For example, Bob has lost this game of HT-3 by
producing a second instance of THT:

                         a   b  a   b  a   b  a   b
               H H  T  T H  T H  T

(iii) Suppose n is odd, and Bob chooses to play by always duplicating Alice’s previous
play (and Alice knows that this is Bob’s strategy). Show that Alice can always win.

In these games, a maximum time of one minute is allowed for each turn.

(iv) Can we be certain that a game of HT-6 will be ﬁnished within two hours? Justify
your answer.

End of last question
```

## Answer / mark scheme candidates

- [Solutions 2011](https://www.maths.ox.ac.uk/system/files/attachments/websolutions11_0.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2011-mat-question-paper__q07/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
