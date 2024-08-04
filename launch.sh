git init
ls -a
DIR_NAME=${PWD%/*}
echo "# $DIR_NAME" > README.md
cat README.md
git add .
git commit -m "first commit"
git remote add origin git@github.com:hirototakao/$DIR_NAME.git
git branch -M main
git push -u origin main
