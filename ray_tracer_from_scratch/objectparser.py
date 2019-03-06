objFile = open('scene_2_monkeys.obj', 'r')

vertexList = []
normalList = []
facesList = []

finalVertexList = []
finalNormalList = []

for line in objFile:
	split = line.split()
	#if blank line, skip
	if not len(split):
		continue
	if split[0] == "v":
		vertexList.append(split[1:])
	elif split[0] == "vn":
		normalList.append(split[1:])
	elif split[0] == "f":
		for i in range(1,len(split)):
			facesList.append(split[i].split('//'))

for f in range(0,len(facesList)):
	# print(facesList[f][0])
	finalVertexList.append(vertexList[int(facesList[f][0])-1])
	finalNormalList.append(normalList[int(facesList[f][1])-1])

with open('finalNormal.txt', 'w') as kappa:
	for item in finalNormalList:
		kappa.write("%s," % item[0])
		kappa.write("%s," % item[1])
		kappa.write("%s,\n" % item[2])

with open('finalVertex.txt', 'w') as keepo:
	for item in finalVertexList:
		keepo.write("%s," % item[0])
		keepo.write("%s," % item[1])
		keepo.write("%s,\n" % item[2])

objFile.close()
kappa.close()
keepo.close()
