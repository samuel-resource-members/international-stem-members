# IB-AI-HL · 2025 · May · 3 · AI HL TZ3 · Q1

- id: ib-dp-math-ai-2025-may-p3-hl-tz3-qp__q01
- course: IB-AI-HL
- exam: IB-AI-HL
- subject: math
- year: 2025
- session: May
- paper: 3
- variant: AI HL TZ3
- question_number: 1
- paper_id: ib-dp-math-ai-2025-may-p3-hl-tz3-qp
- chapter: 概率分布
- knowledge_point: 正态分布
- problem_type: 用正态分布求概率、分位点或参数
- topic_tags: ib-dp-math-ai-2025-may-p3-hl-tz3-qp__q01

## Text (OCR)

```text
1.   [Maximum mark: 28]

     This question considers how the assessment of the Air Quality Index (AQI) for a
     school depends on the method chosen by the person doing the assessing.

      Air quality for a district is measured at three monitoring stations. The positions of these
      stations on a coordinate system with units in kilometres are  A (0 , 5) ,  B (8 , 9) and  C (8 , 1) .

    A Voronoi diagram is constructed with the three stations as sites.

                           y
                      15




                                 B


                 A       V



                                 C

                                                                      x                                           8

      (a)     (i)   Find the equation of the perpendicular bisector of  [BC] .                                   [2]

                   (ii)   Given that the equation of the perpendicular bisector of  [AB]  is  y = 15 − 2x ,
                   find the coordinates of vertex  V .                                                              [2]

(This question continues on the following page)

(Question 1 continued)

    A school,  S , is situated in the district at the point with coordinates (5 , 6) .

      (b)   State which station is closest to the school.                                                         [1]

    The principal of the school is concerned about the air quality in the area. Air quality is
     measured by the Air Quality Index (AQI). In this district, values less than  50  are taken to
      indicate good air quality.

    The principal contacts the local environmental agency requesting an AQI value for her
      school. They tell her the mean AQI reading from the closest station to the school.

       (c)   Write down the type of interpolation being used by the environmental agency.                [1]

    The principal obtains the mean AQI value from each of the three stations.

                               Station          Mean AQI value
                     A                   132
                       B                    49
                       C                   125

      (d)   Explain why the principal might not accept that the air quality around the school can
         be classed as “good”.                                                                                  [1]

(This question continues on the following page)

(Question 1 continued)

    The principal decides to obtain an expected value for the AQI at the school that uses all
      the available information. To do this, she uses an alternative method: the natural neighbour
      algorithm. This algorithm has two stages.

    The first stage is to create a new Voronoi diagram with the school as an extra site. This is
    shown in the following diagram with the edges of the previous diagram shown by dashed lines.

                           y
                      15




                                 B

                        Q
                            P
                 A         S
                            R

                                 C

                                                                      x                                           8

    The second stage is to estimate the AQI value at the school,  W , by using the formula

                           wA a A wB a B  wC aC                   W                                      .
                                       T
      In the formula,  aA  is the area within the new cell that has been taken from the cell
     surrounding site  A , shown as region  P  on the diagram, and  wA  is the mean AQI value
     from site  A . This is given as  132  in the table of mean AQI values above. Similarly for
      sites  B  and  C .  T  is the total area of the new cell around  S .

      (e)     (i)   Find the mid-point of  [SB] .                                                                     [2]

                   (ii)  Show that the equation of the perpendicular bisector of  [SB]  is  y = 14 − x .            [3]

                   (iii)  Hence find  aB  (the area of region  Q  on the diagram).                                      [5]

(This question continues on the following page)

(Question 1 continued)

    The areas of regions  P  and  R  are  aA = 13.7 km2  and  aC = 6.9 km2  respectively.

        (f)   Use the natural neighbour algorithm to show that an estimate for the expected AQI
           value at the school,  W , is  94.4 .                                                                      [2]

    The principal is still concerned that this method is underestimating the AQI value at the
      school, as the school is situated close to a busy traffic intersection. She decides to take her
    own readings (x) over a period of 60 days. Her results are summarized as

                                                                      x̅ = 97.8 , sn−1 = 17.2 , n = 60 .

    The principal assumes that the daily AQI values at the school can be modelled by a normal
      distribution and that each value is independent of any other value.

      (g)   Test at the  10 %  significance level the hypothesis that the mean AQI value at the
           school is greater than  94.4 . State clearly the null and alternative hypotheses and the
           conclusion of the test in context.                                                                      [6]

    The principal now assumes that the distribution of AQI values at the school follows a normal
      distribution with mean  97.8  and standard deviation  17.2 .

      (h)  Use this model to find the expected number of days per year (correct to the nearest
           day) on which the AQI value can be classed as “good”.                                           [3]
```

## Answer / mark scheme candidates

- [IB Diploma Programme Mathematics — May 2025 — Paper 3 — AI HL TZ3 — Mark Scheme](https://papers.xtremepape.rs/IB/2025%20Examination%20Session/May%202025%20Examination%20Session/Mathematics/Mathematics_applications_and_interpretation_paper_3_TZ3_HL_markscheme.pdf)

## Source files

- package `question-bank-math-part-012.zip` (release `subject-resources`) · member `question-corpus/questions/ib-dp-math-ai-2025-may-p3-hl-tz3-qp__q01/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-math-part-012.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
