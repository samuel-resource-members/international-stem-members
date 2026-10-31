# MAT · 2009 · Annual · MAT · Q7

- id: mat-2009-mat-question-paper__q07
- course: MAT
- exam: MAT
- subject: math
- year: 2009
- session: Annual
- paper: MAT
- question_number: 7
- paper_id: mat-2009-mat-question-paper
- topic_tags: mat-2009-mat-question-paper__q07

## Text (OCR)

```text
7. For APPLICANTS IN COMPUTER SCIENCE ONLY.

Consider sequences of the letters M, X and W. Valid sequences are made up according
to the rule that an M and a W can never be adjacent in the sequence. So M, XMXW,
and XMMXW are examples of valid sequences, whereas the sequences MW and XWMX
are not valid.

(i) Clearly, there are 3 valid sequences of length 1. List all valid sequences of length 2.

(ii) Let g(n) denote the number of valid sequences of length n. Further, let m(n), x(n),
w(n) denote the number of valid sequences of length n that start with an M, an X, a W
respectively.

Explain why

          m (n) = w (n) ,
          m (n) = m (n −1) + x (n −1)   for n > 1,
                x (n) = 2m (n −1) + x (n −1)   for n > 1,
and write down a formula for g (n) in terms of m (n) and x (n) .

Hence compute g(3), and verify that g(4) = 41.

(iii) Given a sequence using these letters then we say that it is reﬂexive if the following
operation on the sequence does not change it: reverse the letters in the sequence, and
then replace each occurrence of M by W and vice versa. So MXW, WXXM and XWXMX
are reﬂexive strings, but MXM and XMXX are not. Let r(n) be the number of valid,
reﬂexive sequences of length n.

If a sequence is reﬂexive and has odd length, what must the middle letter be? Explain
your answer.

Hence, show that                    ½  ¡n+1 ¢                             x            if n is odd,
                          r (n) =     ¡n2 ¢                              x          if n is even.                                                  2





                                    18

19
Turn Over

20
End of Last Question

21

22

23

24
```

## Answer / mark scheme candidates

- [Solutions 2009](https://www.maths.ox.ac.uk/system/files/attachments/websolutions09_1.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2009-mat-question-paper__q07/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
