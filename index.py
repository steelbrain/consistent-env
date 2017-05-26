import os
import sys

for key in os.environ.keys():
  sys.stdout.write("%s=%s\0" % (key, os.environ[key]))
