# MAT · 2014 · Annual · MAT · Q7

- id: mat-2014-mat-question-paper__q07
- course: MAT
- exam: MAT
- subject: math
- year: 2014
- session: Annual
- paper: MAT
- question_number: 7
- paper_id: mat-2014-mat-question-paper
- topic_tags: mat-2014-mat-question-paper__q07

## Text (OCR)

```text
7.
              COMPUTER SCIENCE
For APPLICANTS IN                                   ONLY.
              COMPUTER SCIENCE & PHILOSOPHY

  A ﬁnite automaton is a mathematical model of a simple computing device. A small
ﬁnite automaton is illustrated below.

                                      a

                                       s0               s1
                                               b

                                         a                                           b
                                               s2


                                 a                                                     b



A ﬁnite automaton has some ﬁnite number of states; the above automaton has three
states, labelled s0, s1 and s2. The initial state, s0, is indicated with an incoming arrow.
The automaton receives inputs (e.g. via button presses), which might cause it to change
state.  In the example, the inputs are a and b. The state changes are illustrated by
arrows; for example, if the automaton is in state s1 and it receives input b, it changes
to state s0; if it is in state s2 and receives either input, it remains in state s2. (For each
state, there is precisely one out-going arrow for each input.)
   Some of the states are deﬁned to be accepting states; in the example, just s1 is deﬁned
to be an accepting state, represented by the double circle. A word is a sequence of inputs.
The automaton accepts a word w if that sequence of inputs leads to an accepting state
from the initial state. For example, the above automaton accepts the word aba.

  (i) Write down a description of the set of words accepted by the above automaton. A
      clear but informal description will suﬃce.

  (ii) Suppose we alter the above automaton by swapping accepting and non-accepting
      states; i.e. we make s0 and s2 accepting, and make s1 non-accepting. Write down
     a description of the set of words accepted by this new automaton. Again, a clear
     but informal description will suﬃce.

 (iii) Draw an automaton that accepts all words containing an even number (possibly
     zero) of a’s and any number of b’s (and no other words).

 (iv) Now draw an automaton that accepts all words containing an even number of a’s
     or an odd number of b’s (and no other words).

   Let an represent n consecutive a’s. Let L be the set of all words of the form anbn
where n = 0, 1, 2, . . .; i.e. all words composed of some number of a’s followed by the
same number of b’s. We will show that no ﬁnite automaton accepts precisely this set of
words.


                                     18

(v) Suppose a particular ﬁnite automaton A does accept precisely the words in L.
   Show that if i ̸= j then the words ai and aj must lead to diﬀerent states of A.

   Hence show that this leads to a contradiction.





                                                End of last question



                                    19
```

## Answer / mark scheme candidates

- [Solutions 2014](https://www.maths.ox.ac.uk/system/files/attachments/websolutions14_1.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2014-mat-question-paper__q07/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
