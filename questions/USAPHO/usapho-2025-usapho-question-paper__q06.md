# USAPHO · 2025 · Annual · USAPhO · QB3

- id: usapho-2025-usapho-question-paper__q06
- course: USAPHO
- exam: USAPHO
- subject: physics
- year: 2025
- session: Annual
- paper: USAPhO
- question_number: B3
- paper_id: usapho-2025-usapho-question-paper
- chapter: Waves
- knowledge_point: General wave properties
- problem_type: 用频率、波长和波速关系求量
- topic_tags: usapho-2025-usapho-question-paper__q06

## Text (OCR)

```text
Problem B3: Locked and Moded

a. Consider two mirrors facing each other separated by a distance L (a Fabry–P´erot resonator).
  The cavity (the space between the two mirrors) is in vacuum (index of refraction n = 1, no
   dispersion), and the mirrors have high reflectivities so that the main resonance condition is that
  an integer multiple of half-wavelengths fit into the cavity. A light pulse containing multiple
   different frequencies travels between the mirrors and interferes with itself.

      i. State the condition for resonance in terms of L and wavelength λ.

     ii. Write down an expression for the resonant angular frequencies ωm, with m counting each of
      the possible resonances.

    iii. What is the angular frequency spacing ∆ω ≡ωm+1−ωm between adjacent angular frequencies?

b. The electric field at the antinodes of the standing waves in the resonator is a superposition of
   oscillations at the resonant angular frequencies and is given by:

                              +∞
                                   Ebefore(t) = X Ek cos  k ∆ω  t .
                                 k=−∞

  Now suppose we introduce a gain medium (such as a doped crystal) into the laser cavity. The
   gain medium completely absorbs incoming light and re-emits it over a finite range of N angular
   frequencies centered around some angular frequency ω0, which coincides with one of the ωm
   values determined above. Within this bandwidth, the gain medium amplifies and supports
   oscillations at all ωm that fall within the range. (Assume N is an odd number.)

  Assume that each of these N angular frequencies—also referred to as modes—has the same
   amplitude E0, and that their phases are locked such that there is zero relative phase between
  them at t = 0. This condition is known as mode locking. Set their common phase so that all
   electric fields are expressed as cosine functions, consistent with the form of Ebefore(t).

      i. Write an expression for the total electric field Eafter(t) as the sum of these N equally spaced
      angular frequencies (with zero relative phase).

     ii. Show that in the limit of many angular frequencies (∆ω ≪ω0, N ≫1), the time-dependent
       electric field approximately takes the following form:

                                           N (∆ω) t
                                                            sin                                                                        2
                                       Eafter(t) ≈E0f(ω0, t)
                                                             (∆ω) t
                                                             sin                                                                        2

     and determine the function f(ω0, t).

c. To answer the next part of the problem, assume N is odd and find the following limit when
   a = πm, where m is an integer:
                                          sin(Nx)
                                          lim              .
                                    x→a   sin x

d. Mode locking can dramatically increase the peak intensity I of the laser output.  Use the
   expression I = γE2, where γ is a known constant, to answer the following questions.

      i. Determine to the total instantaneous intensity Iafter(t) of the electric field.

2025 USAPhO                            Part B                                      10




     ii. What is the maximum possible intensity of the total field, and at what time(s) is this achieved?

e. The uncertainty principle states ∆x ∆p ≥ℏ  In optics, we are more commonly interested in the                                                  2.
   duration of the pulse rather than its spatial extent; the two are related via ∆x = c ∆t.Consider
   the problem of setting up a very short laser pulse. Use the uncertainty principle to estimate
   the required bandwidth (range of frequencies). Compare that to the relationship between pulse
   duration and gain bandwidth that we’re achieving in this problem.
```

## Answer / mark scheme candidates

- [2025 USAPhO  Solutions](https://www.aapt.org/physicsteam/upload/2025-USAPhO-Exam_solutions.pdf)

## Source files

- package `question-bank-physics-part-007.zip` (release `subject-resources`) · member `question-corpus/questions/usapho-2025-usapho-question-paper__q06/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-physics-part-007.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
