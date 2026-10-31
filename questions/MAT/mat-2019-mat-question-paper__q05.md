# MAT · 2019 · Annual · MAT · Q5

- id: mat-2019-mat-question-paper__q05
- course: MAT
- exam: MAT
- subject: math
- year: 2019
- session: Annual
- paper: MAT
- question_number: 5
- paper_id: mat-2019-mat-question-paper
- chapter: 排列组合
- knowledge_point: 排列与组合
- problem_type: 判断顺序和限制并计算方案数
- topic_tags: mat-2019-mat-question-paper__q05

## Text (OCR)

```text
5. For ALL APPLICANTS.

This question is about counting the number of ways of partitioning a set of n elements
into subsets, each with at least two and at most n elements.  If n and k are integers
with 1 ⩽k ⩽n, let f(n, k) be the number of ways of partitioning a set of n elements
into k such subsets.  For example, f(5, 2) = 10 because the allowable partitions of
{1, 2, 3, 4, 5} are
                           {1, 5}, {2, 3, 4},    {1, 2, 5}, {3, 4},
                           {2, 5}, {1, 3, 4},    {3, 4, 5}, {1, 2},
                           {3, 5}, {1, 2, 4},    {1, 3, 5}, {2, 4},
                           {4, 5}, {1, 2, 3},    {2, 4, 5}, {1, 3},
                                               {1, 4, 5}, {2, 3},
                                               {2, 3, 5}, {1, 4}.

   (i) Explain why f(n, k) = 0 if k > n/2.

  (ii) What is the value of f(n, 1) and why?

 (iii) In forming an allowable partition of {1, 2, . . . , n + 1} into subsets of at least two
      elements, we can either

       • pair n + 1 with one other element, leaving n −1 elements to deal with, or
       • take an allowable partition of {1, 2, . . . , n} and add n+1 to one of the existing
           subsets, making a subset of size three or more.

     Use this observation to ﬁnd an equation for f(n + 1, k) in terms of f(n −1, k −1)
     and f(n, k) that holds when 2 ⩽k < n.

 (iv) Use this equation to compute the value of f(7, 3).

  (v) Give a formula for f(2n, n) in terms of n when n ⩾1 and show that it is correct.





                                     14

Turn over
If you require additional space please use the pages at the end of the booklet



                            15
```

## Answer / mark scheme candidates

- [Solutions 2019](https://www.maths.ox.ac.uk/system/files/attachments/websolutions19.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2019-mat-question-paper__q05/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
