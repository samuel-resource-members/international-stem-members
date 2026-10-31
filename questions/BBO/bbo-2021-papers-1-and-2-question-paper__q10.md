# BBO · 2021 · Annual · Papers 1 and 2 · Q10

- id: bbo-2021-papers-1-and-2-question-paper__q10
- course: BBO
- exam: BBO
- subject: biology
- year: 2021
- session: Annual
- paper: Papers 1 and 2
- question_number: 10
- paper_id: bbo-2021-papers-1-and-2-question-paper
- chapter: Biotechnology and genetic modification
- knowledge_point: 动态规划序列比对及生物学计分
- problem_type: 完成网格并回溯多解、比较序列及调整替换权重
- topic_tags: bbo-2021-papers-1-and-2-question-paper__q10

## Text (OCR)

```text
Question 10

Part 1 of 15
Dynamic programming was invented to align DNA sequences, but now underpins
countless processes, such as language-translation. It breaks a problem into small
steps to find the optimal solution.  In this question, you will use dynamic
programming to align two DNA sequences. First you need a system to score an
alignment. In this algorithm: * Matching bases will be scored +1 * Miss-matched
bases will be scored -1 * Gaps in the alignment will be scored -1 * The highest score
‘wins’ Next, the two sequences are arranged in a grid.





Part 2 of 15
You then generate a score for each cell.  Moving horizontally or vertically indicates
you are skipping bases, creating gaps in the alignment, so you add -1 to the
previous score.





UKBiologyCompetitions.org       BBO 2021

Part 3 of 15
Moving diagonally indicates you are aligning matching or miss-matching bases. You
add +1 to the previous score if they match, or -1 if they miss-match.





Part 4 of 15
Cells in the middle could be scored based on horizontal, vertical or diagonal
movements. The cell should be given the highest score possible.  You then mark
with an arrow which movement this score came from.


UKBiologyCompetitions.org       BBO 2021

Part 5 of 15
Note that some cells can gain an equal score from more than one movement, so
both arrows are included. You then trace backwards along arrows from the bottom
right to generate your highest scoring alignments.





Part 6 of 15
In this example, the two possible alignments are: • G-ATT 1 GCA-T • G-ATT 2
GCAT-


UKBiologyCompetitions.org       BBO 2021

Part 7 of 15
Now extend the above example to align these two sequences from species i and ii.
i) GCAT**GCT**       ii) GATT**ACA** A part filled table is provided for you. You will
probably need to do this on a sheet of rough paper.





Part 8 of 15
What is the highest score of your alignments?

1 mark

Write something below

___________________

Part 9 of 15
How many different alignments have the highest score? *Type a number.*

1 mark

Write something below

___________________

Part 10 of 15
The start of two different alignments was given in the example. How should line 1
be extended? *Type the missing characters: GCA-TXXXXXXXXXXX*

1 mark



UKBiologyCompetitions.org       BBO 2021

Write something below

___________________

Part 11 of 15
Species iii is found to have the sequence GCATGC**A**.

Part 12 of 15
Are these true or false?

4 marks

Mark the following as TRUE or FALSE

a)     Species ii and iii are more closely related than species ii and i.

           TRUE       FALSE

b)    The best alignment between species ii and iii has a higher score than the
best alignment between species ii and i.

           TRUE       FALSE

c)     There are more high scoring alignments between species ii and iii than
between species ii and i.

           TRUE       FALSE

d)     There are more gaps in the alignment between species ii and iii than
between species ii and i.

           TRUE       FALSE

Part 13 of 15
It is more common for a pyrimidine nucleotide (C or T) to mutate into another
pyrimidine, than into a purine (G or A).  The sequence studied above also turned
out to be in a protein coding sequence.

Part 14 of 15
How should the scoring system be adapted to account for these findings?

3 marks

Groups

Reduced

Increased

Put into the groups above

a)     Penalty for C to A mutations

b)     Penalty for gaps in alignment



UKBiologyCompetitions.org       BBO 2021

c)      Penalty for C to T mutations

Part 15 of 15
Protein sequences can also be compared. What are the differences between protein
and DNA alignments?

4 marks

Groups

DNA

Protein

Put into the groups above

a)     Has more complicated scoring system

b)     Sequence changes at a faster rate overtime

c)      Easier to sequence

d)      Better for comparing more distantly related species





UKBiologyCompetitions.org       BBO 2021
```

## Source files

- package `question-bank-biology-part-001.zip` (release `subject-resources`) · member `question-corpus/questions/bbo-2021-papers-1-and-2-question-paper__q10/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-biology-part-001.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
