import os, sys, runpy
def set_attr(path, name, value, *args, **kwargs):
    with open(os.fspath(path) + ':' + os.fsdecode(name), 'wb') as stream:
        stream.write(value)
def get_attr(path, name, *args, **kwargs):
    with open(os.fspath(path) + ':' + os.fsdecode(name), 'rb') as stream:
        return stream.read()
os.setxattr = set_attr
os.getxattr = get_attr
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'helpers'))
runpy.run_path(os.path.join(os.path.dirname(__file__), 'helpers', 'library_file_transfer.py'), run_name='__main__')
