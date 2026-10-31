# MAT · 2022 · Annual · MAT · Q6

- id: mat-2022-mat-question-paper__q06
- course: MAT
- exam: MAT
- subject: math
- year: 2022
- session: Annual
- paper: MAT
- question_number: 6
- paper_id: mat-2022-mat-question-paper
- chapter: 代数
- knowledge_point: 联立方程
- problem_type: 联立条件求未知量
- topic_tags: mat-2022-mat-question-paper__q06

## Text (OCR)

```text
6.           ⎧                          ⎫
            ⎨ COMPUTER SCIENCE            ⎬
For APPLICANTS IN  MATHEMATICS & COMPUTER SCIENCE            ⎩                               ⎭ONLY.
               COMPUTER SCIENCE & PHILOSOPHY

This question is about inﬂuencer networks. An inﬂuencer network consists of n inﬂu-
encers denoted by circles, and arrows between them. Throughout this question, each
inﬂuencer holds one of two opinions, represented by either a △or a □in the circle.
We say that an inﬂuencer A follows inﬂuencer B if there is an arrow from B to A; this
indicates that B has ability to inﬂuence A.

             A         C    A         C
          △        □    □        □
                   B               B
                 □             □

                         Figure 1                Figure 2


   The example in Figure 1 above shows a network with A and B following each other,
B and C following each other, and C also following A. In this example, initially B and C
have opinion □, while A has opinion △. An inﬂuencer will change their mind according
to the strict majority rule, that is, they change their opinion if strictly more than half
of the inﬂuencers they are following have an opinion diﬀerent from theirs. Opinions in
an inﬂuence network change in rounds. In each round, each inﬂuencer will look at the
inﬂuencers they are following and simultaneously change their opinion at the end of the
round according to the strict majority rule. In the above network, after one round, A
changes their opinion because the only inﬂuencer they are following, B, has a diﬀering
opinion, and the network becomes as shown in Figure 2 above.
  An inﬂuencer network with an initial set of opinions is stable if no inﬂuencer changes
their opinion, and a network (with initial opinions) is eventually stable  if after a ﬁnite
number of rounds it becomes stable. The network in the above example is eventually
stable as it becomes stable after one round.

  (i) A network of three inﬂuencers (without opinions) is shown below. Is this inﬂuencer
     network eventually stable regardless of the initial opinions of the inﬂuencers A, B
    and C? Justify your answer.


                      A         C

                            B



  (ii) Another network of inﬂuencers (without opinions) is shown below.  Is this inﬂu-
     encer network eventually stable regardless of the initial opinions of the inﬂuencers?
      Justify your answer.

H

                        F        G

                C         D          E

                     A         B


(iii) A partial network of inﬂuencers (without opinions for B1, . . . , B8) is shown below.
    You can add at most six additional inﬂuencers, assign any opinion of your choice
     to the new inﬂuencers, and add any arrows to the network to describe follower rela-
     tionships. Design a network that is eventually stable regardless of initial opinions,
    and has the property that when it becomes stable A has opinion □if and only if
    each of B1, B2, . . . , B8 had opinion □at the start. Justify your answer.


                   △A




                    B1  B2  B3  B4  B5  B6  B7  B8


(iv) You are given two inﬂuencer networks, N1 and N2, with disjoint sets of inﬂuencers
    shown below.  Both are eventually stable.  Suppose one of the inﬂuencers from
    network N2 follows the inﬂuencer X from the network N1. Is the resulting network
    guaranteed to be eventually stable? Justify your answer.


               N1  X               N2  A         C
            △            △        □
                                      B
                                  □


 (v) (a) Given a network with n inﬂuencers, where the arrows are ﬁxed, but you are
        allowed to assign opinions (△or □) to each inﬂuencer, how many possible
        assignments of opinions is possible?

     (b) Given an inﬂuencer network and an initial assignment of opinions, explain how
        you would determine whether the inﬂuencer network is eventually stable.
         Justify your answer.

Turn over
If you require additional space please use the pages at the end of the booklet
```

## Answer / mark scheme candidates

- [Solutions 2022](https://www.maths.ox.ac.uk/system/files/attachments/websolutions22_2.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/mat-2022-mat-question-paper__q06/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
