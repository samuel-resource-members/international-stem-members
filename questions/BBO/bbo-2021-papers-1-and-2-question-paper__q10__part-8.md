# BBO · 2021 · Q10

- id: bbo-2021-papers-1-and-2-question-paper__q10__part-8
- course: BBO
- exam: BBO
- subject: biology
- year: 2021
- question_number: 10
- chapter: Biotechnology and genetic modification
- knowledge_point: 动态规划序列比对
- problem_type: 按给定计分递推补齐矩阵并确定最优分值
- topic_tags: bbo-2021-papers-1-and-2-question-paper__q10__part-8

## Text (OCR)

```text
Dynamic programming was invented to align DNA sequences, but now underpins 
countless processes, such as language-translation. It breaks a problem into small 
steps to find the optimal solution.   In this question, you will use dynamic 
programming to align two DNA sequences.  First you need a system to score an 
alignment. In this algorithm: * Matching bases will be scored +1 * Miss-matched 
bases will be scored -1 * Gaps in the alignment will be scored -1 * The highest score 
‘wins’  Next, the two sequences are arranged in a grid.  
 

You then generate a score for each cell.   Moving horizontally or vertically indicates 
you are skipping bases, creating gaps in the alignment, so you add -1 to the 
previous score. 

 
 
 
 

Moving diagonally indicates you are aligning matching or miss-matching bases. You 
add +1 to the previous score if they match, or -1 if they miss-match. 
 

Cells in the middle could be scored based on horizontal, vertical or diagonal 
movements. The cell should be given the highest score possible.   You then mark 
with an arrow which movement this score came from. 

 
 
 
 

Note that some cells can gain an equal score from more than one movement, so 
both arrows are included.  You then trace backwards along arrows from the bottom 
right to generate your highest scoring alignments. 
 

In this example, the two possible alignments are:  • G-ATT 1 GCA-T  • G-ATT 2 
GCAT- 

Now extend the above example to align these two sequences from species i and ii.        
i) GCAT**GCT**       ii) GATT**ACA**  A part filled table is provided for you. You will 
probably need to do this on a sheet of rough paper. 
 

What is the highest score of your alignments?
```

## Source files

- `projects/biology-question-processing/bbo-existing/atomic-2021/questions/bbo-2021-papers-1-and-2-question-paper__q10__part-8/question.pdf` (2679855 bytes, sha256 `d1cd9a76f08928909588d317a443fb0381d4de233cb6c4c722ed3a1b99da670c`) inside shard `pdfs-0bcebd647047a864.zip` (91 MB): https://github.com/samuel-resource-members/international-stem-members/releases/download/resources/pdfs-0bcebd647047a864.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
