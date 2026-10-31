# USAPHO · 2021 · Annual · USAPhO · Plus · Q2

- id: usapho-2021-usapho-plus-question-paper__q02
- course: USAPHO
- exam: USAPHO
- subject: physics
- year: 2021
- session: Annual
- paper: USAPhO
- variant: Plus
- question_number: 2
- paper_id: usapho-2021-usapho-plus-question-paper
- chapter: Waves
- knowledge_point: General wave properties
- problem_type: 用频率、波长和波速关系求量
- topic_tags: usapho-2021-usapho-plus-question-paper__q02

## Text (OCR)

```text
Question 2

The Dark Forest

Dark matter could be made of hypothetical, extremely light particles called axions. Because in-
dividual axions are so light, experiments do not search for individual axions, but rather for the
classical axion ﬁeld formed by a large collection of axions, which oscillates as

                                           a(t) = a0 sin(ωt).

This is analogous to how a large collection of photons can form a classical electromagnetic ﬁeld. In
the presence of a magnetic ﬁeld B and an axion ﬁeld a, the axion ﬁeld produces an eﬀective current

                                 J = g ˙aB

where we deﬁne ˙a = da/dt. The eﬀective current produces electromagnetic ﬁelds in exactly the same
way as ordinary current, though it does not come from the motion of actual charges. Experiments
can search for axion dark matter using systems which are resonantly driven by this current.
   You may use fundamental constants in your answers, such as

       c = 3.00 × 108 m/s         ℏ= 1.055 × 10−34 J · s       e = 1.602 × 10−19 C
   G = 6.67 × 10−11 N · m2/kg2     µ0 = 4π × 10−7 N/A2      kB = 1.38 × 10−23 J/K.

You do not have to provide numeric answers unless asked. When asked to “estimate”, you may drop
constants of order one. The numeric values provided below are from standard references where ℏ,
c, µ0, and ϵ0 are set to one; to get correct numeric results, you must restore these factors yourself.

1. First, we will describe some physical properties of the axion ﬁeld.

  (a) Consider a single axion at rest, with mass m. Find its associated angular frequency ω. This
       will be the angular frequency of the corresponding classical ﬁeld, when there are many axions.

  (b) Suppose dark matter is distributed spherically symmetrically in the galaxy with uniform
      density ρ. The solar system is a distance r from the center of the galaxy and orbits around
        it with period T. Neglecting everything besides dark matter, ﬁnd the dark matter density ρ.
  (c) The energy density of the axion ﬁeld is m2a20/(2ℏ3c). Find the axion ﬁeld amplitude a0.
  (d) The radius and period of the Sun’s orbit, as well as a typical axion mass, are

                      r = 2.5 × 1020 m,  T = 7.1 × 1015 s, m = 1.0 × 10−9 eV.

     Numerically compute the axion ﬁeld amplitude a0.

  (e) In this problem, we treat the axion ﬁeld as spatially uniform within a terrestrial laboratory.
     To verify that this assumption is reasonable, numerically estimate the axion ﬁeld’s wavelength
      λ, assuming the axions have the same galactic speed as the Sun.

   (f) In part (a), you found ω by neglecting the axion’s speed. In reality, the axion’s ﬁnite speed
     changes the frequency to ω + ∆ω, in a frame at rest with respect to the galactic center.
     Numerically estimate ∆ω/ω to show that it is reasonable to neglect this eﬀect.

2021 USAPhO+                                                                      6





   The ABRACADABRA1 experiment, currently taking data at MIT, is a toroidal solenoid with
inner and outer radius Rin and Rout and height h. You may assume h ≫Rout for simplicity. A
superconducting wire carrying current I wraps N times around the toroid, where N is high enough
to neglect the discreteness of the wires. A circular pickup loop with radius slightly less than Rin is
placed at the center of the toroid.

2. Now, we will ﬁnd the axion signal generated in the ABRACADABRA apparatus.

  (a) Find the magnetic ﬁeld B(r) inside the toroid due to the superconducting current.

  (b) The superconducting wires lose their superconductivity when exposed to a magnetic ﬁeld
      greater than Bmax. Find the maximum possible current Imax that can be used, and assume
       this current is used in later parts.

  (c) Assuming that ω is small, ﬁnd the magnetic ﬂux ΦB(t) through the pickup loop due to the
      axion ﬁeld in terms of a0, g, ω, Bmax, and the dimensions of the apparatus. (You may ignore
     any currents induced on the surfaces of the superconducting wires.  Accounting for them
     makes the problem much harder, but does not substantially aﬀect the ﬁnal result.)

  (d) If ω is too large, the result above breaks down due to radiation eﬀects. Estimate the frequency
      ωc where this happens.

  (e) Using the design values

                             Rin = 0.5 m,  Rout = 1.0 m,  h = 2.0 m

      estimate the numerical value of ω/ωc.
   (f) Let Φ0 be the amplitude of the time-varying axion ﬂux. Using the typical values

                          Bmax = 5.0 T,  g = 1.0 × 10−16 GeV−1

     and your previous results, compute the numerical value of Φ0.

   1aka, A Broadband/Resonant Approach to Cosmic Axion Detection with an Amplifying B-ﬁeld Ring Apparatus.

2021 USAPhO+                                                                      7




   The pickup loop has inductance L and is attached to a capacitor, forming a circuit with resonant
frequency equal to the axion frequency ω. The circuit also has a small internal resistance R in series,
and is at temperature T. The axion signal can be detected by monitoring the current in the circuit.
The main source of noise is thermal noise, which causes ﬂuctuations in the current.

3. We will now estimate the sensitivity of ABRACADABRA to axions.

  (a) The axion produces a current which oscillates sinusoidally. Find the signal current amplitude
       Is in terms of ω, Φ0, and the circuit parameters.
  (b) Find the average value of the current squared ⟨I2⟩in the circuit due to thermal noise.

  (c) At any moment in time, the noise current is oscillating sinusoidally with typical amplitude
      In = p⟨I2⟩, which is much larger than Is.  However, the phase of the noise current also
      ﬂuctuates randomly, so that after a typical time tc, its phase will be roughly independent of
      the phase it had before. Find an estimate for tc in terms of ω and the circuit parameters.
      (Hint: at any given moment, the thermal noise current is simultaneously being produced by
      the random motion of electrons in the circuit, and damped by the resistor.)

  (d) Suppose the experiment runs for a total time te ≫tc. Roughly estimate the average amplitude
       of the noise current over this period of time.

  (e) The axion is detectable  if the signal current amplitude is larger than the averaged noise
      current amplitude, and the circuit parameters are

                     L = 1 mH,  R = 10 mΩ,  T = 0.1 K.

     Roughly numerically estimate the time needed to potentially detect the axion. (Hint: if your
     answer seems strange, note that in reality, the axion’s phase also ﬂuctuates over time, because
       of the eﬀect of part 1(f). In addition, we don’t know ω ahead of time, so the experiment
      needs to be run many times. We ignored these eﬀects here to keep things simple.)

2021 USAPhO+
```

## Answer / mark scheme candidates

- [2021 USAPhO Plus Solutions](https://www.aapt.org/Common2022/upload/2021-USAPhO_plus_Solutions_v2.pdf)

## Source files

- package `question-bank-physics-part-007.zip` (release `subject-resources`) · member `question-corpus/questions/usapho-2021-usapho-plus-question-paper__q02/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-physics-part-007.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
