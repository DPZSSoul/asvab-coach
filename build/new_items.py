# New original items added in the realism audit (2026-10-17). Facts re-checked by hand.
# Format: (stem, correct, [3 wrongs], topic, difficulty, explanation[, passage])

WK_NEW = [  # stand-alone "most nearly means" (official WK style)
("ABATE","lessen",["increase","begin","hide"],2),("AUGMENT","increase",["reduce","explain","delay"],2),
("BENIGN","harmless",["angry","broken","sudden"],3),("COHERENT","logical",["noisy","loose","hidden"],3),
("CURTAIL","shorten",["extend","repair","praise"],3),("DEXTEROUS","skillful",["clumsy","honest","tired"],3),
("DILEMMA","problem",["answer","journey","reward"],1),("DISCERN","detect",["ignore","damage","borrow"],2),
("EMULATE","imitate",["avoid","defeat","forget"],2),("FLAGRANT","obvious",["hidden","pleasant","minor"],3),
("FRIVOLOUS","silly",["serious","costly","careful"],2),("IMMINENT","approaching",["distant","famous","completed"],2),
("INDIGNANT","angry",["pleased","sleepy","curious"],2),("JOVIAL","cheerful",["gloomy","strict","quiet"],2),
("LAUD","praise",["blame","hear","lift"],3),("NOVICE","beginner",["expert","judge","stranger"],1),
("OBSCURE","unclear",["bright","famous","simple"],2),("PLACID","calm",["stormy","eager","fierce"],2),
("PROFICIENT","skilled",["unable","lazy","careless"],1),("REPLENISH","refill",["empty","waste","discover"],1),
("SALVAGE","save",["destroy","sell","sink"],2),("TACITURN","quiet",["talkative","rude","cheerful"],3),
("TRANQUIL","peaceful",["noisy","busy","angry"],1),("VERIFY","confirm",["doubt","change","hide"],1),
("CONCISE","brief",["wordy","unclear","rude"],2),("ADVERSARY","opponent",["friend","helper","leader"],2),
("CANDOR","honesty",["anger","laziness","wealth"],3),
]
# context items to convert to stand-alone style (word stays, choices stay)
WK_TO_STANDALONE = "abundant scarce rapid candid diligent vague frugal obsolete reluctant meticulous mundane benevolent concur feasible innate lucid mitigate peril prudent tedious wary zealous abrupt adjacent inevitable ample gregarious".split()
WK_DROP = ['"They tried to CONCEAL the damage." Here, CONCEAL most nearly means:', '"A judge must be IMPARTIAL." Here, IMPARTIAL most nearly means:']

GS_NEW = [
("Most of Earth's surface is covered by","oceans",["deserts","forests","ice sheets"],"gs-earth-space",1,"About 71 percent of Earth's surface is ocean."),
("Ocean water is salty mainly because it contains","minerals washed from the land",["sand from beaches","gases from the air","melted ice"],"gs-earth-space",2,"Rivers carry dissolved minerals and salts from rocks into the sea."),
("Deep ocean currents are driven mainly by differences in water","temperature and salt content",["color","sound","light"],"gs-earth-space",3,"Cold, salty water is denser and sinks. This drives deep currents."),
("A barometer measures","air pressure",["humidity","wind speed","rainfall"],"gs-earth-space",2,"Baro means pressure. A barometer measures air pressure."),
("Falling air pressure usually means the weather will","turn stormy",["become clear and dry","stay the same for weeks","have no wind"],"gs-earth-space",3,"Low pressure brings clouds and storms. High pressure brings fair weather."),
("Clouds form when water vapor in rising air","cools and condenses",["heats and expands","turns into oxygen","sinks to the ground"],"gs-earth-space",2,"Rising air cools. The water vapor condenses into tiny drops."),
("The Sun is a","star",["planet","comet","moon"],"gs-earth-space",1,"The Sun is a medium-sized star."),
("The largest planet in our solar system is","Jupiter",["Saturn","Earth","Neptune"],"gs-earth-space",1,"Jupiter is the largest planet."),
("A light-year is a measure of","distance",["time","brightness","speed"],"gs-earth-space",3,"A light-year is how far light travels in one year. It is a distance."),
("Organisms that break down dead plants and animals are called","decomposers",["producers","herbivores","predators"],"gs-cells-life",2,"Decomposers, like fungi and bacteria, break down dead matter."),
("The green pigment in plants that captures light is","chlorophyll",["hemoglobin","keratin","melanin"],"gs-cells-life",2,"Chlorophyll absorbs light for photosynthesis."),
("Traits are passed from parents to offspring through","genes",["vitamins","muscles","habits"],"gs-cells-life",2,"Genes are pieces of DNA that carry traits."),
("Snakes and lizards are cold-blooded animals with dry scales. They are","reptiles",["mammals","amphibians","birds"],"gs-cells-life",2,"Reptiles are cold-blooded and have dry, scaly skin."),
("A frog starts life in water and later lives on land. It is an","amphibian",["reptile","mammal","insect"],"gs-cells-life",2,"Amphibians live part of life in water and part on land."),
("An object floats in water when it is","less dense than water",["more dense than water","made of metal","colder than water"],"gs-physics",2,"Things less dense than water float. Denser things sink."),
("Water pressure on a diver increases as the diver","goes deeper",["swims faster","rises to the surface","holds a breath"],"gs-physics",1,"More water above you means more pressure."),
("A ship floats because the water it pushes aside weighs as much as the ship. This idea is","Archimedes' principle",["Newton's first law","Ohm's law","Boyle's law"],"gs-physics",3,"Archimedes' principle: the buoyant force equals the weight of fluid pushed aside."),
]
GS_DROP = ["Besides sugar, what do plants make in photosynthesis?"]

MK_NEW = [
("Simplify the ratio 28 : 42.","2 : 3",["3 : 2","4 : 7","7 : 6"],"mk-number",1,"Divide both by 14. 28 / 14 = 2. 42 / 14 = 3. So 2 : 3."),
("A fair number cube is rolled. What is the probability of rolling an even number?","1/2",["1/3","1/6","2/3"],"mk-probability",1,"Even numbers: 2, 4, 6. That is 3 of 6. 3/6 = 1/2."),
("A spinner has 8 equal parts. 3 are red. What is the probability of NOT landing on red?","5/8",["3/8","3/5","1/8"],"mk-probability",2,"8 - 3 = 5 parts are not red. So 5/8."),
("Two fair coins are flipped. What is the probability that both land heads?","1/4",["1/2","1/3","3/4"],"mk-probability",2,"Each coin is 1/2. Multiply: 1/2 x 1/2 = 1/4."),
("Simplify: (x^2 - 16)/(x - 4)","x + 4",["x - 4","x + 16","x^2 + 4"],"mk-polynomials",3,"Factor the top: (x - 4)(x + 4). Cancel (x - 4). Answer x + 4 (when x is not 4)."),
]
# bare-computation AR items rewritten as word problems (official AR = word problems)
AR_REWRITE = {
"What is 25% of 80?":"A ship has 80 sailors. 25% of them are on watch. How many sailors are on watch?",
"What is 20% of 150?":"A truck carries 150 boxes. 20% of the boxes hold food. How many boxes hold food?",
"18 is what percent of 72?":"A team played 72 games and won 18 of them. What percent of its games did it win?",
"How many inches are in 3 yards?":"A sailor cuts a rope 3 yards long. How many inches long is the rope?",
"How many minutes are in 3.5 hours?":"A training class lasts 3.5 hours. How many minutes long is the class?",
"How many inches are in 2.5 feet?":"A shelf board is 2.5 feet long. How many inches long is the board?",
"How many pints are in 5 quarts?":"A cooler holds 5 quarts of water. How many pints of water is that?",
"Find the average of 70, 80, 90, 100, and 60.":"Five sailors score 70, 80, 90, 100, and 60 on a test. What is their average score?",
}
AR_TO_MK = ["A jar has 5 red, 7 blue, and 8 green marbles. One is picked at random. What is the probability it is blue?"]

PC_DROP = ["How long is a watch, according to the passage?","How many high tides do most coasts have each day?",
 "Which metal carries current slightly better than copper?","How could sailors tell lighthouses apart?","What has replaced most lighthouses?",
 "What must be done after a fuse blows?","The marks along the tube are used to:","Under the 3-2-1 rule, how many copies of data should be kept?",
 "What should technicians do each month?","Why does the passage mention a label at each end?","What helped Ana feel better?"]
PC_RETAG = {"How did Ana feel by lunch?":"pc-detail"}
PC_NEW = [
("Nearly all the data that crosses the oceans travels not through satellites but through cables on the sea floor. These cables, often no thicker than a garden hose, carry phone calls, bank transfers, and video between continents. Repair ships wait in ports around the world, because one anchor dragged by a careless ship can cut a line and slow internet service for a whole region.",
 [("The author's main purpose in this passage is to","inform readers about an important but little-known system",["persuade readers to stop using satellites","explain how to repair a cable","criticize ship captains"],"pc-author",3,"The passage gives facts about undersea cables. It does not argue or give repair steps."),
  ("It can be inferred from the passage that undersea cables","are important enough that breaks are fixed quickly",["are rarely used today","cannot be damaged by ships","are thicker than most pipes"],"pc-inference",3,"Repair ships wait in ports so cuts can be fixed fast. That shows the cables matter.")]),
("Critics called the new bridge a waste of money when it was first proposed. Ten years later, the same critics drive across it every morning, and traffic downtown has never moved more smoothly. The bridge, it turns out, was not a luxury but a necessity.",
 [("The author's attitude toward the bridge is best described as","approving",["doubtful","angry","neutral"],"pc-author",2,"The author says traffic moves better and calls the bridge a necessity. That is approval."),
  ("As used in the passage, LUXURY means something that is","nice to have but not needed",["costly to repair","dangerous to use","required by law"],"pc-vocab",3,"Luxury is set against necessity. So it means something extra, not needed.")]),
("When the general alarm sounds, sailors first stop what they are doing and listen for the announcement. The announcement gives the type and place of the emergency. Sailors then go to their assigned stations by the fastest safe route. Once there, they report to the section leader, who takes a head count. Only after every sailor is accounted for does the team begin its tasks.",
 [("What do sailors do right after hearing the announcement?","Go to their assigned stations",["Begin their tasks","Take a head count","Leave the ship"],"pc-sequence",1,"The word then comes after the announcement. Sailors go to their stations."),
  ("What must happen before the team begins its tasks?","Every sailor must be accounted for.",["The alarm must stop.","The ship must reach port.","The leader must write a report."],"pc-sequence",2,"The last sentence says tasks begin only after everyone is accounted for."),
  ("The head count is most likely done to","make sure no one is missing",["choose a new leader","time the drill","decide the emergency type"],"pc-inference",2,"Counting heads shows if anyone is missing or hurt.")]),
("Every sailor should learn to swim well before joining the fleet. Ships are safe, but accidents at sea happen fast. A strong swimmer has more time to wait for rescue. Swim training costs little, and it could save a life.",
 [("The author's purpose is to","persuade readers that swimming is an important skill",["describe how ships are built","explain how rescues are planned","compare different swim strokes"],"pc-author",2,"The author says sailors should learn to swim and gives reasons. That is persuasion."),
  ("The tone of the passage is best described as","serious",["humorous","bitter","uncertain"],"pc-author",2,"The author talks about safety and saving lives in a serious way.")]),
("A firewall acts like a guard at the gate of a network. It checks each piece of incoming data against a set of rules and blocks anything that breaks them. A well-set firewall stops many attacks before they start. But it cannot protect against a user who willingly opens a harmful attachment. For that reason, training people is as important as installing equipment.",
 [("As used in the passage, WILLINGLY most nearly means","by choice",["by accident","quickly","angrily"],"pc-vocab",2,"The user chooses to open the file. Willingly means by choice."),
  ("Which statement best expresses the main idea of the passage?","Firewalls help, but people must also be trained.",["Firewalls stop every attack.","Attachments are always harmful.","Guards should watch network gates."],"pc-main-idea",2,"The passage praises firewalls, then says training people matters just as much."),
  ("The author would most likely agree that","no single tool can keep a network fully safe",["firewalls are a waste of money","users never cause problems","training is less important than equipment"],"pc-inference",3,"The firewall cannot stop a user's choice. So one tool is not enough."),
  ("The author compares a firewall to a guard at a gate in order to","explain an idea using something familiar",["show that firewalls are people","describe a real gate","prove that guards are not needed"],"pc-author",3,"A guard is easy to picture. The comparison helps explain what a firewall does.")]),
("The old radio operator had a voice like gravel, but his messages were always crystal clear. Young sailors who doubted him soon learned to copy his slow, careful way of speaking.",
 [("The phrase \"crystal clear\" suggests that his messages were","easy to understand",["made of glass","very loud","hard to hear"],"pc-vocab",2,"Crystal clear is a figure of speech. It means very easy to understand.")]),
("In 1942, the Marine Corps began training Navajo speakers to send messages in a code based on their language. The code was never broken during the war. Many of the code talkers did not speak publicly about their work until the program was declassified in 1968.",
 [("Why did many code talkers not talk about their work until 1968?","The program was kept secret until then.",["They forgot what they did.","The code was broken in 1968.","They were not allowed to speak Navajo."],"pc-inference",2,"Declassified means no longer secret. So it was secret before 1968."),
  ("The passage is mainly written to","describe a little-known part of history",["teach readers the Navajo language","argue that codes are useless","explain how radios work"],"pc-author",2,"The passage tells a true story from the war. Its purpose is to inform about history.")]),
("Solar panels make the most power when sunlight strikes them directly. Because the sun's angle changes with the seasons, some panels are mounted on frames that tilt. Others are fixed in place at an angle chosen to give the best result over the whole year. Fixed panels cost less to install, while tilting panels produce more power over a year.",
 [("The passage mainly compares","two ways of mounting solar panels",["solar power and wind power","summer and winter weather","the costs of different houses"],"pc-main-idea",2,"The passage compares tilting panels and fixed panels."),
  ("A buyer with a small budget would most likely choose","fixed panels",["tilting panels","no panels at all","panels that face away from the sun"],"pc-inference",2,"The passage says fixed panels cost less to install.")]),
("To change a flat tire, first park on level ground and set the brake. Next, loosen the lug nuts slightly while the tire is still on the ground. Then raise the car with the jack, remove the nuts, and swap the tire.",
 [("When should the lug nuts first be loosened?","Before the car is raised",["After the tire is removed","Before parking the car","After the new tire is on"],"pc-sequence",2,"The passage says to loosen them while the tire is still on the ground, before the jack.")]),
]

EI_DROP = ["Which unit measures frequency?","A transistor can be used as a:","A bulb is rated 60 watts at 120 volts. How much current does it draw?",
 "What does LED stand for?","Which material is the best conductor?"]
EI_NEW = [
("On a schematic, one long line next to one short line stands for a","battery cell",["resistor","switch","lamp"],"ei-symbols-tools",2,"A cell is drawn as a long line (plus side) and a short line (minus side)."),
("On a schematic, three short flat lines that get smaller, like an upside-down triangle, stand for","ground",["a battery","a fuse","a capacitor"],"ei-symbols-tools",2,"The ground symbol is lines that get shorter as they go down."),
("On a schematic, two equal parallel lines with a small gap between them stand for a","capacitor",["resistor","diode","transformer"],"ei-symbols-tools",3,"A capacitor is two plates with a gap. It is drawn as two parallel lines."),
("On a schematic, a triangle pointing at a short bar stands for a","diode",["resistor","capacitor","fuse"],"ei-symbols-tools",3,"The triangle points the way current flows. The bar blocks the other way. That is a diode."),
("A multimeter can measure","voltage, current, and resistance",["only power","only frequency","only temperature"],"ei-symbols-tools",1,"A multimeter combines a voltmeter, an ammeter, and an ohmmeter."),
("A tool that joins wires with melted metal is a","soldering iron",["wire stripper","multimeter","fuse puller"],"ei-symbols-tools",2,"A soldering iron melts solder to join wires."),
("The north poles of two magnets are pushed close together. They","push apart",["pull together","lose their magnetism","become south poles"],"ei-magnetism",1,"Like poles repel. Opposite poles attract."),
("An electric motor changes","electrical energy into motion",["motion into electrical energy","heat into light","sound into electrical energy"],"ei-magnetism",2,"A motor uses electricity and magnets to make motion. A generator does the reverse."),
("Moving a magnet in and out of a coil of wire","makes a current flow in the wire",["melts the wire","turns the magnet into copper","has no effect on the wire"],"ei-magnetism",3,"A changing magnetic field makes current in a wire. This is induction."),
("Which metal is strongly attracted to a magnet?","iron",["copper","aluminum","gold"],"ei-magnetism",1,"Iron is magnetic. Copper, aluminum, and gold are not."),
("Silicon, used to make computer chips, is a","semiconductor",["insulator","perfect conductor","magnet"],"ei-materials",2,"Silicon conducts better than an insulator but not as well as a metal. It is a semiconductor."),
("Electrical wires are covered with plastic because plastic is","an insulator",["a conductor","a magnet","a semiconductor"],"ei-materials",1,"Plastic blocks current. It keeps the current inside the wire."),
("Which change lowers the resistance of a copper wire?","making the wire thicker",["making the wire longer","heating the wire","coating the wire in rubber"],"ei-materials",3,"A thicker wire gives current more room. Longer or hotter wire has more resistance."),
("Standard wall outlets in U.S. homes supply about","120 volts AC",["12 volts DC","1.5 volts DC","1,000 volts AC"],"ei-ac-dc",2,"U.S. homes use about 120 volts AC at 60 hertz."),
("A transformer works with AC but not with steady DC because it needs","a changing magnetic field",["a high resistance","a ground wire","a diode"],"ei-ac-dc",3,"Transformers work by induction. Induction needs a changing current, like AC."),
("The number of complete AC cycles in one second is its","frequency",["resistance","wattage","capacitance"],"ei-ac-dc",2,"Frequency is cycles per second, measured in hertz."),
("A 120 volt circuit has a 15 amp breaker. What is the most power it can supply before the breaker trips?","1,800 watts",["8 watts","135 watts","18,000 watts"],"ei-power",2,"P = V x I = 120 x 15 = 1800 watts."),
("A 48 ohm heater is connected to 120 volts. How much current does it draw?","2.5 amps",["0.4 amps","72 amps","5,760 amps"],"ei-ohms-law",2,"I = V / R = 120 / 48 = 2.5 amps."),
("A 4 ohm resistor is in series with two 8 ohm resistors that are in parallel with each other. What is the total resistance?","8 ohms",["20 ohms","12 ohms","2 ohms"],"ei-series-parallel",3,"Two 8 ohm in parallel = 8 / 2 = 4 ohms. Add the series 4 ohms: 4 + 4 = 8 ohms."),
("A flashlight bulb has 6 ohms of resistance and draws 0.5 amps. What voltage does the battery supply?","3 volts",["12 volts","6.5 volts","0.08 volts"],"ei-ohms-law",2,"V = I x R = 0.5 x 6 = 3 volts."),
("A 120 volt lamp draws 0.25 amps. What is its resistance?","480 ohms",["30 ohms","120 ohms","0.002 ohms"],"ei-ohms-law",3,"R = V / I = 120 / 0.25 = 480 ohms."),
("The voltage across a resistor stays the same, but its resistance is doubled. What happens to the current?","It is cut in half.",["It doubles.","It stays the same.","It becomes four times larger."],"ei-ohms-law",2,"I = V / R. Twice the resistance means half the current."),
]
