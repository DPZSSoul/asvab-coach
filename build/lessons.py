# Topic lessons. Plain words. Short lines. Used by the tutor (offline) and the re-learn panel.
# what = what it is, why = why it matters, example = tiny real-life example,
# idea = hint 1, worked = hint 3 (a SIMILAR problem with different numbers, every step shown).
L = {}
def t(key, section, name, what, why, example, idea, worked):
    L[key] = dict(section=section, name=name, what=what, why=why, example=example, idea=idea, worked=worked)

# ---------------- AR ----------------
t('ar-rate','AR','Distance, rate, and time',
  ['Distance is how far you go.','Rate is how fast. Time is how long.'],
  'AR asks rate questions on almost every test.',
  ['A ship goes 20 miles each hour.','After 2 hours, it went 40 miles.'],
  'Distance equals rate times time. D = R x T.',
  ['A truck drives 50 miles per hour for 3 hours.','Step 1: D = R x T.','Step 2: D = 50 x 3.','Step 3: D = 150 miles.'])
t('ar-work','AR','Working together',
  ['Work problems ask how long a job takes.','Add how much each worker does in 1 hour.'],
  'These are tricky. Many people miss them.',
  ['You wash half the car in an hour.','A friend washes the other half in that hour.','Together you finish in 1 hour.'],
  'Find the part of the job done in 1 hour. Then flip it.',
  ['Pump A fills a tank in 2 hours. Pump B in 2 hours.','Step 1: Each hour, A does 1/2. B does 1/2.','Step 2: Together: 1/2 + 1/2 = 1 tank each hour.','Step 3: Time = 1 hour.'])
t('ar-percent','AR','Percents: sales, tax, tips',
  ['Percent means "out of 100".','25% means 25 out of 100.'],
  'Sales, tax, tips, and pay raises use percents.',
  ['A $10 meal. You tip 20%.','20% of 10 is 2. You pay $12.'],
  'Change the percent to a decimal. Then multiply.',
  ['What is 30% of 50?','Step 1: 30% = 0.30.','Step 2: 0.30 x 50 = 15.','Answer: 15.'])
t('ar-interest','AR','Simple interest',
  ['Interest is money paid for using money.','Simple interest: I = P x r x t.'],
  'Banks and loans use it. AR tests it often.',
  ['You save $100 at 10% a year.','After 1 year you earn $10.'],
  'Interest = principal times rate times time.',
  ['$200 at 5% for 2 years.','Step 1: 5% = 0.05.','Step 2: 200 x 0.05 = 10 each year.','Step 3: 10 x 2 years = $20.'])
t('ar-ratio','AR','Ratios and proportions',
  ['A ratio compares two amounts.','3 to 5 means 3 parts and 5 parts.'],
  'Recipes, maps, and mixes all use ratios.',
  ['2 scoops of mix for 1 cup of water.','For 3 cups, use 6 scoops.'],
  'Add the parts. Find one part. Then multiply.',
  ['Red to blue is 1 to 3. There are 20 cars.','Step 1: 1 + 3 = 4 parts.','Step 2: 20 / 4 = 5 per part.','Step 3: Blue = 3 x 5 = 15.'])
t('ar-average','AR','Averages',
  ['The average is the fair share.','Add them all. Divide by how many.'],
  'Test scores and pay use averages.',
  ['Three friends have $2, $4, and $6.','Total $12. Share it 3 ways: $4 each.'],
  'Average = total divided by how many.',
  ['Find the average of 4, 6, and 8.','Step 1: 4 + 6 + 8 = 18.','Step 2: 18 / 3 = 6.','Answer: 6.'])
t('ar-units','AR','Units and time',
  ['Units tell what you measure.','Hours, minutes, feet, inches, gallons.'],
  'You must match units before you do math.',
  ['A movie is 2 hours.','2 x 60 = 120 minutes.'],
  'Change to the same unit first. 1 hour = 60 minutes. 1 foot = 12 inches.',
  ['How many minutes in 1.5 hours?','Step 1: 1 hour = 60 minutes.','Step 2: 1.5 x 60 = 90.','Answer: 90 minutes.'])
t('ar-fractions','AR','Fractions in word problems',
  ['A fraction is a part of a whole.','3/4 means 3 of 4 equal parts.'],
  'Tanks, books, and pay often use fractions.',
  ['A pizza has 8 slices.','You eat 1/4 of it. That is 2 slices.'],
  'To find a fraction of a number: divide by the bottom. Times the top.',
  ['What is 2/3 of 30?','Step 1: 30 / 3 = 10.','Step 2: 10 x 2 = 20.','Answer: 20.'])
t('ar-money','AR','Money and totals',
  ['Many AR problems are shopping math.','Find the cost of each part. Then add.'],
  'This is the most common AR question.',
  ['2 sodas at $1.50 each.','2 x 1.50 = 3.00.'],
  'Multiply price by how many. Then add or subtract.',
  ['3 shirts at $8 each and a hat for $5.','Step 1: 3 x 8 = 24.','Step 2: 24 + 5 = 29.','Answer: $29.'])
t('ar-number','AR','Number puzzles',
  ['Number puzzles describe a number in words.','Turn the words into math.'],
  'They test clear thinking, not hard math.',
  ['Two numbers add to 10. They differ by 2.','The numbers are 6 and 4.'],
  'Write what you know. Use the middle or the sum.',
  ['Three numbers in a row add to 30.','Step 1: Middle = 30 / 3 = 10.','Step 2: The numbers are 9, 10, 11.','Smallest: 9.'])
t('ar-geometry','AR','Area and perimeter in word problems',
  ['Area is the space inside. Perimeter is the edge.','Area of a rectangle = length x width.'],
  'Paint, carpet, and fences use these.',
  ['A rug is 3 feet by 2 feet.','Area: 3 x 2 = 6 square feet.'],
  'Area = length x width. Perimeter = add all sides.',
  ['A room is 10 by 12 feet. Tile covers 20 square feet a box.','Step 1: Area = 10 x 12 = 120.','Step 2: 120 / 20 = 6.','Answer: 6 boxes.'])
# ---------------- MK ----------------
t('mk-equations','MK','Solving equations',
  ['An equation is a balance.','Both sides must stay equal.'],
  'MK has many "solve for x" questions.',
  ['A scale has a box and 2 pounds on one side.','5 pounds on the other side.','The box must weigh 3 pounds.'],
  'Undo the steps. Do the same thing to both sides.',
  ['Solve 2x + 4 = 10.','Step 1: Subtract 4 from both sides. 2x = 6.','Step 2: Divide both sides by 2. x = 3.','Check: 2 times 3 plus 4 is 10.'])
t('mk-inequalities','MK','Inequalities',
  ['An inequality uses < or >.','Solve it like an equation.'],
  'One rule trips people up. Know it.',
  ['You need more than $5 for lunch.','Any amount over 5 works.'],
  'If you multiply or divide by a negative, FLIP the sign.',
  ['Solve -3x < 9.','Step 1: Divide both sides by -3.','Step 2: Flip the sign: x > -3.'])
t('mk-systems','MK','Two equations',
  ['Two equations, two unknowns.','Combine them to get one unknown.'],
  'Shows up a few times on MK.',
  ['Two shirts cost $30. One costs $10 more.','Prices: $20 and $10.'],
  'Add or subtract the equations so one letter goes away.',
  ['x + y = 8 and x - y = 2.','Step 1: Add them: 2x = 10.','Step 2: x = 5.','Step 3: y = 8 - 5 = 3.'])
t('mk-exponents','MK','Exponents and roots',
  ['An exponent says how many times to multiply.','3^2 means 3 x 3 = 9.'],
  'Exponents and square roots are common on MK.',
  ['A square room is 4 feet on a side.','4^2 = 16 square feet.','The square root of 16 is 4.'],
  'Same base: multiply means add powers. Divide means subtract powers.',
  ['What is 2^3 x 2^2?','Step 1: Same base 2. Add powers: 3 + 2 = 5.','Step 2: 2^5 = 32.'])
t('mk-polynomials','MK','Expanding and factoring',
  ['Expanding multiplies out the parentheses.','Factoring goes backward.'],
  'MK uses these on harder questions.',
  ['5 boxes of (2 apples + 3 pears).','That is 10 apples + 15 pears.'],
  'Multiply each term by each term (FOIL). To factor, find two numbers that multiply and add.',
  ['Expand (x + 1)(x + 4).','Step 1: x times x = x^2.','Step 2: x times 4 plus 1 times x = 5x.','Step 3: 1 times 4 = 4.','Answer: x^2 + 5x + 4.'])
t('mk-quadratics','MK','Quadratic equations',
  ['A quadratic has an x^2.','It often has two answers.'],
  'MK asks to solve or factor them.',
  ['Two numbers multiply to 6 and add to 5.','They are 2 and 3.'],
  'Factor. Then set each part equal to zero.',
  ['Solve x^2 - 7x + 10 = 0.','Step 1: Numbers that multiply to 10, add to -7: -2 and -5.','Step 2: (x - 2)(x - 5) = 0.','Step 3: x = 2 or x = 5.'])
t('mk-functions','MK','Plugging in values',
  ['f(x) is a rule. Put a number in. Get a number out.'],
  'Plug-in questions are quick points.',
  ['A rule: double it, then add 1.','Put in 3. Get 7.'],
  'Replace x with the number. Then follow order of operations.',
  ['If f(x) = x^2 + 1, find f(2).','Step 1: Put in 2: 2^2 + 1.','Step 2: 4 + 1 = 5.'])
t('mk-area-volume','MK','Area, perimeter, volume',
  ['Area is flat space inside. Volume is space in 3D.','Each shape has a formula.'],
  'Geometry is a big part of MK.',
  ['A shoebox is 10 by 6 by 4 inches.','Volume: 10 x 6 x 4 = 240 cubic inches.'],
  'Rectangle: L x W. Triangle: half of base x height. Circle: pi x r^2. Box: L x W x H.',
  ['A triangle has base 8 and height 5.','Step 1: Area = 1/2 x base x height.','Step 2: 1/2 x 8 x 5 = 20.'])
t('mk-triangles-angles','MK','Angles and right triangles',
  ['A triangle has 180 degrees inside.','A straight line is 180 degrees.','Right triangles use a^2 + b^2 = c^2.'],
  'Angle and triangle questions are common.',
  ['A ladder against a wall makes a right triangle.','The ladder is the long side.'],
  'Angles in a triangle add to 180. For a right triangle, a^2 + b^2 = c^2.',
  ['Legs are 3 and 4. Find the long side.','Step 1: 3^2 + 4^2 = 9 + 16 = 25.','Step 2: Square root of 25 is 5.'])
t('mk-fractions','MK','Fractions and decimals',
  ['Fractions and decimals both show parts.','0.5 is the same as 1/2.'],
  'MK tests adding, dividing, and changing them.',
  ['Half a dollar is $0.50.','A quarter is $0.25, or 1/4.'],
  'To add: match the bottoms. To divide: flip the second and multiply.',
  ['What is 1/2 divided by 1/4?','Step 1: Flip 1/4 to 4/1.','Step 2: 1/2 x 4 = 2.'])
t('mk-number','MK','Number facts',
  ['Primes, factors, multiples, order of operations.','Median, rounding, absolute value.'],
  'These are quick points if you know the rules.',
  ['12 cookies can be split by 1, 2, 3, 4, 6, or 12.','Those are the factors of 12.'],
  'Order of operations: parentheses, exponents, times and divide, then plus and minus.',
  ['What is 2 + 3 x 4?','Step 1: Multiply first: 3 x 4 = 12.','Step 2: 2 + 12 = 14.'])
t('mk-slope','MK','Slope and graphs',
  ['Slope is how steep a line is.','Rise over run.'],
  'Lines and points show up on MK.',
  ['A ramp goes up 1 foot for every 4 feet forward.','Slope = 1/4.'],
  'Slope = change in y divided by change in x. In y = mx + b, m is the slope.',
  ['Points (1, 1) and (3, 5).','Step 1: Rise: 5 - 1 = 4.','Step 2: Run: 3 - 1 = 2.','Step 3: 4 / 2 = 2.'])
t('mk-probability','MK','Probability and counting',
  ['Probability is the chance something happens.','Chance = good outcomes / all outcomes.'],
  'One or two MK questions use this.',
  ['A coin has 2 sides.','Chance of heads = 1/2.'],
  'Count the good outcomes. Divide by all outcomes. For two events in a row, multiply.',
  ['A bag has 2 red, 3 blue. Pick one.','Step 1: Good = 2 red.','Step 2: All = 5.','Step 3: Chance = 2/5.'])
# ---------------- WK ----------------
t('wk-context','WK','Word meaning in a sentence',
  ['You see a word in a sentence.','Pick the word that means the same.'],
  'WK and PC make up VE. VE counts double for AFQT. It is in every IT line score.',
  ['"The soup was SCALDING. I burned my tongue."','The clue "burned" tells you: very hot.'],
  'Use the sentence as a clue. Is the mood good or bad?',
  ['"The trail was ARDUOUS. We were tired."','Step 1: Clue: "tired".','Step 2: Mood: hard, not fun.','Step 3: ARDUOUS means difficult.'])
t('wk-synonym','WK','Word meaning (no sentence)',
  ['You see a word by itself.','Pick the word closest in meaning.'],
  'About half the WK words come with no sentence.',
  ['MERRY means happy.','You can try "a merry day" in a sentence.'],
  'Make up your own short sentence with the word. Look for word parts.',
  ['Word: BENEFIT.','Step 1: Sentence: "Sleep is a benefit to health."','Step 2: Word part: "bene" means good.','Step 3: BENEFIT means help or advantage.'])
# ---------------- PC ----------------
t('pc-main-idea','PC','Main idea',
  ['The main idea is what the whole passage is about.','It is the big point, not one detail.'],
  'Almost every PC set has a main idea question.',
  ['A text says: buy snacks, pick a movie, call friends.','The main idea: planning a movie night.'],
  'Ask: what is the one big point? Check the first and last lines.',
  ['Passage: "Dogs need walks. Dogs need food. Dogs need care."','Step 1: Every line is about caring for dogs.','Step 2: Main idea: dogs need care.'])
t('pc-detail','PC','Finding details',
  ['A detail question asks for one fact.','The answer is written in the passage.'],
  'Detail questions are the easiest PC points.',
  ['A sign says: "Store opens at 9."','Q: When does it open? Find "9".'],
  'Read the question first. Find the line that answers it.',
  ['Passage: "The ship left at noon. It reached port at 6."','Q: When did it reach port?','Step 1: Look for "port".','Step 2: The line says 6.'])
t('pc-inference','PC','Inference (reading between lines)',
  ['An inference is not said out loud.','You figure it out from clues.'],
  'Harder PC questions ask what you can infer.',
  ['Your friend comes in wet with an umbrella.','You infer it is raining.'],
  'Pick the answer the passage supports. Do not add outside ideas.',
  ['Passage: "Sam studied every day. He passed the test easily."','Q: What can you infer?','Step 1: Clues: studied, passed easily.','Step 2: Study helped Sam pass.'])
t('pc-vocab','PC','Word meaning in a passage',
  ['Some PC questions ask what a word means.','The meaning comes from the passage.'],
  'The common meaning may be a trap.',
  ['"The coach will FIELD questions."','Here FIELD means answer, not grass.'],
  'Put each choice in place of the word. Pick the one that fits.',
  ['"The plan was SOUND."','Step 1: Try "noisy": does not fit.','Step 2: Try "solid and good": fits.','Answer: SOUND means solid.'])
t('pc-author','PC','Author view, tone, and purpose',
  ['Tone is how the author feels.','Purpose is why the author wrote it.'],
  'These test if you understand the writer.',
  ['A text says: "Wear a seat belt. It saves lives."','Purpose: to persuade you.'],
  'Look for feeling words. Ask: why did they write this?',
  ['Passage: "Recycling is simple and helps us all."','Step 1: Feeling words: simple, helps.','Step 2: The author is in favor of recycling.'])
t('pc-sequence','PC','Steps in order',
  ['Some passages give steps.','Words like first, next, then, finally show order.'],
  'Tech jobs use step-by-step instructions.',
  ['First boil water. Next add noodles. Then drain.','Draining comes last.'],
  'Find the order words. Number the steps.',
  ['"First save the file. Next close the app. Then restart."','Q: What comes after saving?','Step 1: Find "Next".','Step 2: Close the app.'])
# ---------------- GS ----------------
t('gs-human-body','GS','Human body',
  ['The body has systems.','Heart and blood, lungs, nerves, bones.'],
  'GS often asks what each organ does.',
  ['After a run your heart beats fast.','It pumps more blood to your muscles.'],
  'Match each organ to its job.',
  ['Q: Which organ helps you breathe?','Step 1: Breathing means air.','Step 2: Air goes to the lungs.','Answer: lungs.'])
t('gs-cells-life','GS','Cells, plants, and living things',
  ['All living things are made of cells.','Plants make food from light.'],
  'Life science is a big part of GS.',
  ['A houseplant by a window grows toward the light.','It uses light to make food.'],
  'Know the cell parts and how plants make food (photosynthesis).',
  ['Q: What part of a cell makes energy?','Step 1: Energy = power plant.','Step 2: The mitochondria is the power plant.'])
t('gs-earth-space','GS','Earth and space',
  ['Earth science covers rocks, weather, and planets.'],
  'A few GS questions each test.',
  ['Summer is warm because sunlight hits more directly.','That comes from the tilt of Earth.'],
  'Know the planets in order, the rock types, and the layers of air.',
  ['Q: Which planet is biggest?','Step 1: The gas giants are big.','Step 2: Jupiter is the biggest.'])
t('gs-chemistry','GS','Matter and chemistry',
  ['Matter is anything with mass.','Atoms make up elements. Elements join into compounds.'],
  'GS asks about atoms, pH, and changes of state.',
  ['Ice melts into water. Same stuff, new form.','That is a physical change.'],
  'Physical change: same stuff. Chemical change: new stuff. pH under 7 is acid.',
  ['Q: Is burning wood a chemical change?','Step 1: Ash and smoke are new stuff.','Step 2: Yes, it is chemical.'])
t('gs-physics','GS','Force, energy, heat, sound, light',
  ['Physics explains motion, energy, heat, sound, and light.'],
  'Physics also helps on EI and MC tests.',
  ['Pushing a cart: the harder you push, the faster it goes.','That is force.'],
  'Know Newton\'s three laws and how heat moves: conduction, convection, radiation.',
  ['Q: A pan handle gets hot on the stove. Why?','Step 1: Heat moves through touch.','Step 2: That is conduction.'])
