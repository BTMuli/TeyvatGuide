#!/bin/bash
printf '\e[8;45;65t'
clear
BLACK="\033[0;30m"  
DARK_GRAY="\033[1;30m"  
BLUE="\033[0;34m"  
LIGHT_BLUE="\033[1;34m"  
GREEN="\033[0;32m"  
LIGHT_GREEN="\033[1;32m"  
CYAN="\033[0;36m"  
LIGHT_CYAN="\033[1;36m"  
RED="\033[0;31m"  
LIGHT_RED="\033[1;31m"  
PURPLE="\033[0;35m"  
LIGHT_PURPLE="\033[1;35m"  
BROWN="\033[0;33m"  
YELLOW="\033[0;33m"  
LIGHT_GRAY="\033[0;37m"  
WHITE="\033[1;37m" 
NC="\033[0m"
                                                     
appName="TeyvatGuide.app"
appBashName=${appName// /\ }
appDIR="/Applications/${appBashName}"

# Check system language
LANGUAGE=$(defaults read -g AppleLocale | cut -d "_" -f 1)

if [ "$LANGUAGE" != "zh" ]; then

  echo -e "Fix tool of 『${RED}${appBashName%.*} ${NC}is damaged and cannot be opened / from an unidentified developer』"
  echo ""
  # Prompt to install the app if not installed, bypass notarization if installed
  if [ ! -d "$appDIR" ];then
    echo -e "❌ ${LIGHT_RED}You have not installed ${appBashName%.*}, please copy the software to the 【${NC}${LIGHT_BLUE}Applications${NC}${LIGHT_RED}】 directory${NC}"
  else
    # Bypass notarization
    echo -e "👇 ${LIGHT_RED}Please enter the administrator password (usually the boot password), press Enter after entering (the password is invisible during input)${NC}"
    sudo spctl --master-disable
    sudo /usr/bin/xattr -rd com.apple.quarantine /Applications/"$appBashName"
    echo ""
    echo -e "😁 ${LIGHT_GREEN}Repair successful!${NC} You can now run ${LIGHT_GREEN}${appBashName%.*} ${NC}normally."
  fi
  echo ""
  echo -e "✌️  The operation has been successfully completed, you can close this window now!"

else

  echo -e "『${RED}${appBashName%.*} ${NC}已损坏,无法打开/来自身份不明的开发者』等问题修复工具"
  echo ""
  #未安装APP时提醒安装，已安装绕过公证
  if [ ! -d "$appDIR" ];then
    echo -e "❌ ${LIGHT_RED}您还未安装 ${appBashName%.*}, 请先将软件拷贝到【${NC}${LIGHT_BLUE}应用程序${NC}${LIGHT_RED}】目录${NC}"
  else
    #绕过公证
    echo -e "👇 ${LIGHT_RED}请输入管理员密码（一般情况下就是开机密码）, 输入完成后按下回车键(输入过程中密码是看不见的)${NC}"
    sudo spctl --master-disable
    sudo /usr/bin/xattr -rd com.apple.quarantine /Applications/"$appBashName"
    echo ""
    echo -e "😁 ${LIGHT_GREEN}修复成功！${NC}您现在可以正常运行 ${LIGHT_GREEN}${appBashName%.*} ${NC}了。"
  fi
  echo ""
  echo -e "✌️  操作已成功完成, 本窗口可以关闭啦！"

fi
