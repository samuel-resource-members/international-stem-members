# MAT · 2025 · Annual · MAT · Q27Y

- id: mat-2025-mat-question-paper__q04
- course: MAT
- exam: MAT
- subject: math
- year: 2025
- session: Annual
- paper: MAT
- question_number: 27Y
- paper_id: mat-2025-mat-question-paper
- topic_tags: mat-2025-mat-question-paper__q04

## Text (OCR)

```text
Question 27 Y
An office building has n meeting rooms numbered 1, 2,  . . . , n according to their size.
Meeting room 1 only has space for one person, meeting room 2 has space for two people,
and so on, up to meeting room n, which has space for n people.

The office has n teams, numbered 1, 2, . . . , n who call reception in that order one-by-one
to book a meeting room. For i = 1, . . . , n, team i has size t(i), where t(i) is a whole
number with 1 ≤t(i) ≤n. When team i calls reception, they are given the smallest
available meeting room among meeting rooms with size greater than or equal to t(i). If
all these rooms have already been booked, then team i do not manage to book a meeting
room.

We represent the sizes of the teams using a list (t(1), t(2), . . . , t(n)). We call the list good
if all teams manage to book a meeting room, and we write G(n) for the number of good
lists of length n.

For example with n = 2, each of the lists (1, 1), (1, 2), (2, 1) is good because for each of
them both teams manage to make a booking, whereas the list (2, 2) is not good because
the first team takes meeting room 2 and then the second team doesn’t fit in the remaining
meeting room. We have G(2) = 3.

From part (iii) onwards, we will define F(n, k) to be the number of good lists of length
n which result in team n booking room k.

  (i) For n = 3, explain why the list (2, 1, 1) is good, but the list (2, 2, 2) is not good.
                                                            2 marks

  (ii) For n = 3, there are 16 good lists, so G(3) = 16.  List all of them, starting with
    good lists with t(1) = 1, then good lists with t(1) = 2, and then good lists with
      t(1) = 3.                                                 3 marks

 (iii) For k = 1, . . . , n, let F(n, k) be the number of good lists of length n which result
      in team n booking room k.

     Explain why F(n, k) is a multiple of k.                          2 marks

 (iv) Describe the relationship between G(n) and F(n, 1), F(n, 2), . . . , F(n, n).
                                                             1 mark

 (v) Explain why F(4, 1) = G(3) and F(4, 4) = 4 × G(3).                3 marks

 (vi) Find the values of F(4, 2) and F(4, 3). Explain your answers in each case.
    Hence find the value of G(4).                                  4 marks
```

## Answer / mark scheme candidates

- [Solutions 2025](https://www.maths.ox.ac.uk/system/files/inline-files/websolutions25.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2025-mat-question-paper__q04/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
