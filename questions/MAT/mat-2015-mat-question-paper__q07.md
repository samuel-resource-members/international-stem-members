# MAT · 2015 · Annual · MAT · Q7

- id: mat-2015-mat-question-paper__q07
- course: MAT
- exam: MAT
- subject: math
- year: 2015
- session: Annual
- paper: MAT
- question_number: 7
- paper_id: mat-2015-mat-question-paper
- topic_tags: mat-2015-mat-question-paper__q07

## Text (OCR)

```text
7.
              COMPUTER SCIENCE
For APPLICANTS IN                                   ONLY.
              COMPUTER SCIENCE & PHILOSOPHY

   In this question we will study a mechanism for producing a set of words. We will
only consider words containing the letters a and/or b, and that have length at least 1.
We will make use of variables, which we shall write as capital letters, including a
special start variable called S. We will also use rules, which show how a variable can
be replaced by a sequence of variables and/or letters. Starting with the start variable
S, we repeatedly replace one of the variables according to one of the rules (in any order)
until no variables remain.
   For example suppose the rules are

              S →AB,   A →AA,   A →a,   B →bb.

  We can produce the word aabb as follows; at each point, the variable that is replaced
is underlined:

                S →AB →AAB →AaB →aaB →aabb.

   (i) Show that the above rules can be used to produce all words of the form anbb with
    n ≥1, where an represents n consecutive a’s.

     Also brieﬂy explain why the rules can be used to produce no other words.

  (ii) Give a precise description of the words produced by the following rules.

                         S →ab,    S →aSb.


 (iii) A palindrome is a word that reads the same forwards as backwards, for example
      bbaabb. Give rules that produce all palindromes (and no other words).

 (iv) Consider the words with the same number of a’s as b’s; for example, aababb. Write
    down rules that produce these words (and no others).

  (v) Suppose you are given a collection of rules that produces the words in L1, and
     another collection of rules that produces the words in L2. Show how to produce
     a single set of rules that produce all words in L1 or L2, or both (and no other
     words). Hint: you may introduce new variables if you want.





                                                 End of last question



                                     20
```

## Answer / mark scheme candidates

- [Solutions 2015](https://www.maths.ox.ac.uk/system/files/attachments/websolutions15_3.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2015-mat-question-paper__q07/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
