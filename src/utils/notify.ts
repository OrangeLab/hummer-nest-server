import { Record } from "src/records/entities/record.entity";

interface Field {
  label: string;
  value: string;
}

enum MessageCardType {
  INFO = "blue",
  WARN = "yellow",
  SUCCESS = "green",
  FAIL = "red"
}

export interface OriginMessage {
  title: string;
  fields: Field[];
  linkName?: string;
  link?: string;
  type?: MessageCardType;
}

const marked = (content: string): string => {
  const pattern = {
    link: /\[(.+)\]\((.+)\)/
  };
  const result = pattern.link.exec(content);
  if (result) {
    const [_, linkName, link] = result;
    return `<a href="${link}">${linkName}</a>`;
  }
  return content;
};

/**
 * 获取邮件内容
 */
export const getHtmlFromContent = (content: OriginMessage): string => {
  const { title, fields, link, linkName = "查看详情" } = content;
  const html = `
    <style>
      h2{
        font-size: 16px;
      }
      p {
        font-size: 14px;
      }
      blockquote {
        font-size: 14px;
        border-left: 4px solid #8163bd;
        padding: 12px!important;
        color: #777;
        background-color: rgba(99, 99, 172, .05);
        margin: 0!important;
      }
    </style>
    <h2>${title}</h2>
    <blockquote>
      <p>
        ${fields
      .map(field => {
        // eslint-disable-next-line prefer-template
        return field.label + "：" + marked(field.value);
      })
      .join("<br/>")}
      </p>
    </blockquote>
    <a href="${link}">${linkName}</a> 
  `;
  return html;
};

/**
 * 获取域名
 */
export const getSiteUrl = (): string => {
  const serverEnv = process.env.SERVER_ENV || "online";

  return ``;
};

/**
 * 发布单基本信息
 */
export const getMsgFromRecordInfo = (info: any): Field[] => {
  if (info?.version) {
    const {
      version,
      androidVersions = [],
      iosVersions = [],
      description
    } = info;
    return [
      { label: "发布版本", value: version },
      { label: "Android应用版本", value: androidVersions.join(",") },
      { label: "iOS应用版本", value: iosVersions.join(",") },
      { label: "发布描述", value: description }
    ];
  }
  return [];
};

export const sendMail = (emails: any, info: any) => {
  // TODO: 接入邮件推送服务
}