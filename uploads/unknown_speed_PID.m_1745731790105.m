clear;clc
ts=0.005;  %采样时间=0.005s
sys=tf(11.1335,[0.12628,1]);   %建立被控对象传递函数
dsys=c2d(sys,ts,'z');      %离散化
[num,den]=tfdata(dsys,'v');
e_1=0;      %前一时刻的偏差，初始化为0
Ee=0;       %累积偏差
u_1=0.0;    %前一时刻的控制量
y_1=0;       %前一时刻的输出
%PID参数
kp=2;
ki=0.078;
kd=0.014;
for k=1:1:500
    time(k)=k*ts;   %时间参数
    r(k)=4000;      %给定量
    y(k)=-1*den(2)*y_1+num(2)*u_1;  %传递函数转化后的差分方程
    e(k)=r(k)-y(k);   %偏差
    u(k)=kp*e(k)+ki*Ee+kd*(e(k)-e_1);    %位置式PID
    Ee=Ee+e(k);
    u_1=u(k);
    y_1=y(k);
    e_1=e(k);   % 保存这个时刻的误差，保存于e_1
end
plot(time,r,'r',time,y,'b');

%% 展示数值
% 超调量
chaotiao=(max(y)-r(1))./r(1);
disp(chaotiao);

% 稳态误差
wtwc=(y(length(y))-r(1))./r(1);
disp(wtwc);
