# MAT · 2017 · Annual · MAT · Q6

- id: mat-2017-mat-question-paper__q06
- course: MAT
- exam: MAT
- subject: math
- year: 2017
- session: Annual
- paper: MAT
- question_number: 6
- paper_id: mat-2017-mat-question-paper
- chapter: 排列组合
- knowledge_point: 排列与组合
- problem_type: 判断顺序和限制并计算方案数
- topic_tags: mat-2017-mat-question-paper__q06

## Text (OCR)

```text
6.
             COMPUTER SCIENCE            
                                      For APPLICANTS IN  MATHEMATICS & COMPUTER SCIENCE
             COMPUTER SCIENCE & PHILOSOPHY  ONLY.

You need to pack several items into your shopping bag, without squashing any item.
Suppose each item i has a (positive) weight wi, and a strength si which is the maximum
weight that can be placed above it without it being squashed. For the purposes of this
question, suppose that the items will be arranged one on top of the other within your
bag. We will say that a particular packing order is safe if no item is squashed, that is,
for each item i, si is at least the sum of the wj corresponding to items j placed above
item i. For example, suppose we have the following items, packed in the order given

                           Ordering  Item     wi   si
                         Top    Apples   5   6
                           Middle   Bread    4   4
                        Bottom   Carrots  12  9

This packing is not safe: the bread is squashed, since the weight above it (5) is greater
than its strength (4). However, swapping the apples and the bread gives a safe packing.

(i) Which of the other four orderings of apples, bread, and carrots are safe or unsafe?

(ii) Consider the tactic of packing the items in weight order, with the heaviest at the
bottom. Show by giving an example that this might not produce a safe packing order,
even if a safe packing order exists.

(iii) Now consider the tactic of packing the items in strength order, with the strongest
at the bottom. Again show by giving an example that this might not produce a safe
packing order, even if one exists.

(iv) Suppose we have a safe packing order, with item j directly on top of item i. Suppose
further that

                             wj −si ⩾  wi −sj.

Show that if we swap items i and j, we still have a safe packing order.

(v) Hence suggest a practical method of producing a safe packing order if one exists.
Explain why your method works. (Listing all possible orderings is not practical.)





                                     16

Turn over
If you require additional space please use the pages at the end of the booklet



                            17
```

## Answer / mark scheme candidates

- [Solutions 2017](https://www.maths.ox.ac.uk/system/files/attachments/websolutions17.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2017-mat-question-paper__q06/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
