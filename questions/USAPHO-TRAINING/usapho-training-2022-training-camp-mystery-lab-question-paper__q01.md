# USAPHO-TRAINING · 2022 · Annual · Training Camp Mystery Lab · QThe Future Circular Collider

- id: usapho-training-2022-training-camp-mystery-lab-question-paper__q01
- course: USAPHO-TRAINING
- exam: USAPHO-TRAINING
- subject: physics
- year: 2022
- session: Annual
- paper: Training Camp Mystery Lab
- question_number: The Future Circular Collider
- paper_id: usapho-training-2022-training-camp-mystery-lab-question-paper
- chapter: Practical skills
- knowledge_point: Experimental design and data
- problem_type: 处理实验变量、读数、图像和误差
- topic_tags: usapho-training-2022-training-camp-mystery-lab-question-paper__q01

## Text (OCR)

```text
The Future Circular Collider

1  Safety Warnings

There are no unusual safety concerns in this experiment.

2  Overview

Particle physicists, condensed matter physicists, atomic physicists, and chemists all gain insight into the
structure of matter by scattering experiments. In these experiments, we smash particles into other particles,
look at what comes out, and infer what happened during the collision.  In this lab, you will carry on
this tradition by analyzing simulated collisions involving circular disks sliding on a horizontal table, with
specified initial conditions. The disks always lay flat on the table, which is frictionless. In the simulation,
collisions between objects obey the following rules:

  • The relative velocity along the normal direction is flipped in sign and multiplied by the coefficient of
      restitution c, where c = 1 for a perfectly elastic collision.
  • The relative velocity along the tangential direction is changed by friction in the usual way:  if it is
      zero, static friction tries to keep it zero, and if it is nonzero, it is pushed towards zero by a kinetic
      friction force µN, where N is the normal force.

There are many ways to extract the requested parameters, so you will be graded primarily on the precision
and accuracy of your results. The initial conditions you specify will receive both inherent absolute and
relative uncertainties, so you should choose appropriate values and perform multiple trials to get an accurate
result. An uncertainty estimate is expected for all parts, but depending on how you carry out
the experiment, each subpart might or might not require a graph. As always, include in your report any
diagrams, supporting calculations, and other information necessary to show how you obtained your results.

2022 Experimental Exam                                                                     2


3  Equipment

This  is a pure simulation experiment, with no physical equipment.  The only thing required  is the
collision-black-box program to simulate collisions, which can be downloaded here.
The procedure to run the program depends on the operating system. On Windows:

  • Search for powershell in the start menu and run it to open a terminal. You will do the entire lab by
     typing commands into this terminal.
  • Navigate to the folder containing the downloaded collision-black-box program, by running
     cd <path-to-folder>. On most computers, the right command to run is cd ~/Downloads.
  • Use collision-black-box-windows.exe wall to run the first part of the experiment, and use
     collision-black-box-windows.exe disk to run the second part.

On macOS, the procedure is somewhat more complicated:

  • Launch the Terminal app. You will do the entire lab by typing commands into this terminal.
  • Navigate to the folder containing the downloaded collision-black-box program, by running
     cd <path-to-folder>. On most computers, the right command to run is cd ~/Downloads.
  • Run chmod +x collision-black-box-macos to mark the file as an executable program.
  • Run open . to open the current folder in Finder. In Finder, control-click the collision-black-box
     program to open a menu, and select Open. Confirm the dialog box that comes up. Another terminal
      will quickly appear and disappear. The program has now been granted permission to run.
  • Return to the terminal and use ./collision-black-box-macos wall to run the first part of the
     experiment, and use ./collision-black-box-macos disk to run the second part.

2022 Experimental Exam                                                                     3


4  Experiment

4.1  Collision with Wall

In this part, you will launch a disk with mass M, radius R and moment of inertia I = βMR2 towards a
fixed, long vertical wall. You specify the initial speed and counter-clockwise angular velocity of the disk,
and the angle of its initial velocity incident to the normal of the wall. The program will simulate the
collision and return the final values of these parameters after collision.

                   you input:                    program returns:

                                                                                              final speed (m/s)
                                incidence angle (°)       reflected angle (°)
         initial speed (m/s)

                                                                                  final angular velocity (rad/s)

       initial angular velocity (rad/s)


The parameters you specify must be in the following ranges:
  • 0.5 m/s ≤initial speed ≤10 m/s.
  • −50 rad/s ≤initial angular velocity ≤50 rad/s.
  • 0° ≤incidence angle ≤75°.
To simulate imperfections in the disk-firing mechanism, the initial values you specify are always affected
by the following uncertainties:
  • Initial speed: relative uncertainty 5 %, compounded with absolute uncertainty 0.05 m/s.
  • Initial angular velocity: relative uncertainty 5 %, compounded with absolute uncertainty 0.2 rad/s.
  • Incidence angle: absolute uncertainty 1°.


 1. (a) Find the coefficient of restitution c between the disk and wall.
   (b) Find the radius R of the disk, and the values of µ and β.

2022 Experimental Exam                                                                     4


4.2  Collision with Disk

In this part, you will launch a “probe” disk towards a hidden, second disk on the table, which begins at
rest with its center at an unknown position (x0, y0) (where x0 > 0), with mass M and radius R. The
probe disk has radius r = (0.250 ± 0.001) m, but you may choose its mass m, initial position (0, s), initial
speed v, and the initial direction θ of its velocity (as an angle relative to the horizontal). Both disks are
frictionless, so that rotation is irrelevant. The program will simulate the collision, if it occurs, and return
the final velocity (speed and angle) of the probe disk.


                                    y
                                           v                  m
                                              θ
                                             r

                                s                        ?  M
                               R
                                            y0

                                                     x

                                              x0

The parameters you choose must be in the following ranges:
  • 1 kg ≤m ≤5 kg.
  • −2 m ≤s ≤2 m.
  • 0.5 m/s ≤v ≤10.0 m/s.
  • −90° ≤θ ≤90°.
The parameters you specify are affected by the following uncertainties:
  • m: relative 1 %, plus absolute 0.05 kg.
  • s: absolute 2 mm.
  • v: relative 1 %, plus absolute 0.05 m/s.
  • θ: absolute 0.1°.


 2. (a) Find the initial position (x0, y0) of the hidden disk.
   (b) Find the radius R of the hidden disk.
    (c) Find the mass M of the hidden disk and the coefficient of restitution c between the disks.
```

## Answer / mark scheme candidates

- [2022 Training Camp Mystery Lab  Solutions](https://www.aapt.org/physicsteam/upload/2022_Experiment_TST_Solutions.pdf)

## Source files

- package `question-bank-physics-part-007.zip` (release `subject-resources`) · member `question-corpus/questions/usapho-training-2022-training-camp-mystery-lab-question-paper__q01/question.pdf`: https://github.com/samuel-resource-members/international-stem-members/releases/download/subject-resources/question-bank-physics-part-007.zip

Download the shard or package ZIP, verify the SHA-256 when given, and extract only the listed member path.
