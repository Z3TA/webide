with open(r'version.inc','r+') as f:
	value = int(f.read())
	f.seek(0)
	f.write(str(value + 1))
