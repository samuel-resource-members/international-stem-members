# MAT · 2011 · Annual · MAT · Q5

- id: mat-2011-mat-question-paper__q05
- course: MAT
- exam: MAT
- subject: math
- year: 2011
- session: Annual
- paper: MAT
- question_number: 5
- paper_id: mat-2011-mat-question-paper
- chapter: 排列组合
- knowledge_point: 排列与组合
- problem_type: 判断顺序和限制并计算方案数
- topic_tags: mat-2011-mat-question-paper__q05

## Text (OCR)

```text
5. For ALL APPLICANTS.

An n × n grid consists of squares arranged in n rows and n columns; for example, a
chessboard is an 8 × 8 grid. Let us call a semi-grid of size n the lower left part of an
n × n grid — that is, the squares located on or below the grid’s diagonal. For example,
Figure C shows an example of a semi-grid of size 4.





                                 R

                                    Figure C
Let us suppose that a robot is located in the lower-left corner of the grid. The robot
can move only up or right, and its goal is to reach one of the goal squares, which are
all located on the semi-grid’s diagonal. In the example shown in Figure C, the robot is
initially located in the square denoted with R, and the goal squares are shown in grey.
Let us call a solution a sequence of the robot’s moves that leads the robot from the
initial location to some goal square.

(i) Write down all 8 solutions for a robot on a semi-grid of size 4.

(ii) Devise a concise way of representing the possible journeys of the robot in a semi-grid
of size n. In your notation, which of the journeys are solutions?

(iii) Write down a formula for the number of possible solutions in a semi-grid of size n.
Explain why your formula is correct.

Now let us change the problem slightly and redeﬁne a goal square as any square that
can be described as follows:
   • the lower-left square is not a goal square;
   • each square that is located immediately above or immediately to the right of a
     non-goal square is a goal square; and
   • each square that is located immediately above or immediately to the right of a
      goal square is a non-goal square.

Furthermore, let us assume that, upon reaching a goal square, the robot may decide to
stop or to continue moving (provided that there are more allowed moves).

(iv) With these modiﬁcations in place, write down all the solutions in a semi-grid of size
4, and all the solutions in a semi-grid of size 5.

(v) How many solutions are there now in a semi-grid of size n, where n is a positive
integer? You may wish to consider separately the cases where n is even or odd.
```

## Answer / mark scheme candidates

- [Solutions 2011](https://www.maths.ox.ac.uk/system/files/attachments/websolutions11_0.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2011-mat-question-paper__q05/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
