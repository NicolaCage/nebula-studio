import {
  Breadcrumb,
  Button,
  Checkbox,
  Col,
  Collapse,
  Form,
  Icon,
  Input,
  message,
  Modal,
  Popconfirm,
  Popover,
  Select,
  Table,
} from 'antd';
import _ from 'lodash';
import React from 'react';
import intl from 'react-intl-universal';
import { connect } from 'react-redux';
import { match, RouteComponentProps, withRouter } from 'react-router-dom';

import GQLCodeMirror from '#assets/components/GQLCodeMirror';
import { IDispatch, IRootState } from '#assets/store';
import { dataType, nameReg } from '#assets/utils/constant';
import { getAlterGQL } from '#assets/utils/gql';
import { trackEvent, trackPageView } from '#assets/utils/stat';

import './Edit.less';

const Panel = Collapse.Panel;
const Option = Select.Option;
const confirm = Modal.confirm;

const mapState = (state: IRootState) => ({
  loading: state.loading.effects.nebula.asyncGetEdgeDetail,
});

const mapDispatch = (dispatch: IDispatch) => ({
  asyncGetEdgeDetail: dispatch.nebula.asyncGetEdgeDetail,
  asyncAlterField: dispatch.nebula.asyncAlterField,
  asyncGetIndexTree: dispatch.nebula.asyncGetIndexTree,
});

interface IProps
  extends ReturnType<typeof mapState>,
    ReturnType<typeof mapDispatch>,
    RouteComponentProps {
  match: match<{
    space: string;
    edge: string;
  }>;
  asyncUpdateEditStatus: (status: boolean) => void;
}

interface IRequired {
  fieldRequired: boolean;
  ttlRequired: boolean;
}

interface ITtl {
  col: string;
  duration: string;
}
interface IState extends IRequired {
  fieldList: IField[];
  ttlConfig: ITtl | null;
  editRow: number | null;
  editTtl: boolean;
  editField: IEditField | null;
  editTtlConfig: ITtl | null;
}

type AlterType = 'ADD' | 'DROP' | 'CHANGE' | 'TTL';

interface IField {
  name: string;
  type: string;
  value: string;
}

interface IEditField extends IField {
  alterType: AlterType;
}

class EditEdge extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      fieldRequired: false,
      ttlRequired: false,
      editTtl: false,
      fieldList: [],
      ttlConfig: null,
      editRow: null,
      editField: null,
      editTtlConfig: null,
    };
  }

  componentDidMount() {
    trackPageView('/schema/config/edge/edit');
    this.getDetails();
  }

  getDetails = async () => {
    const { match } = this.props;
    const {
      params: { edge },
    } = match;
    const { code, data } = await this.props.asyncGetEdgeDetail(edge);
    if (code === 0) {
      const info = data.tables[0]['Create Edge'];
      this.handleData(info);
    }
  };

  handleData = (data: string) => {
    const reg = /CREATE EDGE\s`\w+`\s(?<!string)\((.*)(?<!\d)\)\s+(ttl_duration = \d+),\s+(ttl_col\s+=\s+"?\w*"?)/gm;
    const str = data.replaceAll(/[\r\n]/g, ' ');
    const infoList = reg.exec(str) || [];
    const fieldStr =
      infoList &&
      infoList[1].slice(1, infoList[1].length - 1).replace(/[\r\n]/g, '');
    const fields = fieldStr !== '' ? fieldStr.split(',') : [];
    const ttlDuration = (infoList && infoList[2].split(' = ')[1]) || '';
    const ttlCol =
      (infoList && infoList[3].split(' = ')[1].replace(/"/g, '')) || '';
    const fieldList: IField[] = fields.map(i => {
      const fieldReg = /`(.+)`\s+([0-9a-zA-Z\_\(\)]+)\s+(NOT NULL|NULL)(?:\sDEFAULT\s+(.+))?/g;
      const result = fieldReg.exec(i) || [];
      return {
        name: result[1],
        type: result[2],
        null: result[3] === 'NULL',
        value:
          result[4] === undefined
            ? ''
            : result[4].replace(/^"/, '').replace(/"$/, ''),
      };
    });
    const fieldRequired = fieldList.length > 0;
    const ttlRequired = ttlCol !== '';
    const ttlConfig = {
      col: ttlCol,
      duration: ttlCol !== '' ? ttlDuration : '',
    };
    this.setState({
      fieldList,
      ttlConfig,
      fieldRequired,
      ttlRequired,
    });
  };

  handleAddField = () => {
    const { fieldList } = this.state;
    const editField: IEditField = {
      name: '',
      type: '',
      value: '',
      alterType: 'ADD',
    };
    const newList = [...fieldList, editField];
    this.setState({
      fieldList: newList,
      editRow: fieldList.length,
      editField,
    });
    this.props.asyncUpdateEditStatus(true);
  };

  handleDeleteField = async (fields: IField[]) => {
    const { match } = this.props;
    const {
      params: { edge },
    } = match;
    const res = await this.props.asyncAlterField({
      type: 'EDGE',
      name: edge,
      action: 'DROP',
      config: {
        fields,
      },
    });
    if (res.code === 0) {
      message.success(intl.get('common.deleteSuccess'));
      this.getDetails();
    } else {
      message.warning(res.message);
    }
    trackEvent(
      'schema',
      'delete_edge_property',
      res.code === 0 ? 'ajax_success' : 'ajax_fail',
    );
  };

  handleEditField = (data: IField, index: number) => {
    const { ttlConfig } = this.state;
    if (ttlConfig && ttlConfig.col === data.name) {
      return message.warning(intl.get('schema.fieldDisabled'));
    }
    const editField = {
      ..._.cloneDeep(data),
      alterType: 'CHANGE' as AlterType,
    };
    this.setState({
      editRow: index,
      editField,
    });
    this.props.asyncUpdateEditStatus(true);
  };

  handleCancelEdit = () => {
    const { editField, fieldList } = this.state;
    this.setState({
      editRow: null,
      editField: null,
    });
    this.props.asyncUpdateEditStatus(false);
    if (editField && editField.alterType === 'ADD') {
      this.setState({
        fieldList: fieldList.slice(0, fieldList.length - 1),
      });
    }
  };

  handleEditTtl = () => {
    this.setState({
      editTtl: true,
      editTtlConfig: _.cloneDeep(this.state.ttlConfig),
    });
    this.props.asyncUpdateEditStatus(true);
  };

  handleCancelEditTtl = () => {
    const { ttlConfig } = this.state;
    this.setState({
      editTtl: false,
      editTtlConfig: null,
      ttlRequired: ttlConfig && ttlConfig.col === '' ? false : true,
    });
    this.props.asyncUpdateEditStatus(false);
  };

  handleChangeValue = (key: string, value: string) => {
    const editField = this.state.editField;
    const newField = editField!;
    newField[key] = value;
    if (key === 'type') {
      newField.value = '';
    }
    this.setState({
      editField: newField,
    });
  };
  handleChangeTtl = (key: string, value: string) => {
    const editTtlConfig = this.state.editTtlConfig;
    const newTtl = editTtlConfig!;
    newTtl[key] = value;
    if (key === 'col') {
      newTtl.duration = '';
    }
    this.setState({
      editTtlConfig: newTtl,
    });
  };

  handleUpdateField = async () => {
    const { match } = this.props;
    const {
      params: { edge },
    } = match;
    const { editField } = this.state;
    if (editField) {
      const { name, type, alterType } = editField;
      if (name === '' || type === '') {
        return message.warning(intl.get('schema.fieldRequired'));
      }
      if (name !== '' && !nameReg.test(name)) {
        return message.warning(intl.get('formRules.nameValidate'));
      }
      const res = await this.props.asyncAlterField({
        type: 'EDGE',
        name: edge,
        action: alterType,
        config: {
          fields: [editField],
        },
      });
      if (res.code === 0) {
        message.success(intl.get('common.updateSuccess'));
        this.getDetails();
        this.setState({
          editRow: null,
          editField: null,
        });
        this.props.asyncUpdateEditStatus(false);
      } else {
        message.warning(res.message);
      }
      trackEvent(
        'schema',
        'update_edge_property',
        res.code === 0 ? 'ajax_success' : 'ajax_fail',
      );
    }
  };

  handleUpdateTtl = async () => {
    const { match } = this.props;
    const {
      params: { edge },
    } = match;
    const { editTtlConfig } = this.state;
    if (editTtlConfig) {
      const { col, duration } = editTtlConfig;
      if (col === '' || duration === '') {
        return message.warning(intl.get('schema.ttlRequired'));
      }
      const reg = /^\d+$/;
      if (!reg.test(duration)) {
        return message.warning(intl.get('formRules.positiveIntegerRequired'));
      }
      const res = await this.props.asyncAlterField({
        type: 'EDGE',
        name: edge,
        action: 'TTL',
        config: {
          ttl: editTtlConfig,
        },
      });
      if (res.code === 0) {
        message.success(intl.get('common.updateSuccess'));
        this.getDetails();
        this.setState({
          editTtl: false,
          editTtlConfig: null,
        });
        this.props.asyncUpdateEditStatus(false);
      } else {
        message.warning(res.message);
      }
      trackEvent(
        'schema',
        'update_edge_ttl',
        res.code === 0 ? 'ajax_success' : 'ajax_fail',
      );
    }
  };

  handleTogglePanels = async (e: string | string[], type: string) => {
    const { match } = this.props;
    const {
      params: { edge },
    } = match;
    if (e.length > 0) {
      if (type === 'field') {
        this.handleAddField();
        this.setState({
          fieldRequired: true,
        });
      } else {
        const res = (await this.props.asyncGetIndexTree('EDGE')) || [];
        const hasIndex = res.filter(i => i.name === edge).length > 0;
        if (hasIndex) {
          return message.warning(intl.get('schema.indexExist'));
        } else {
          this.handleEditTtl();
          this.setState({
            ttlRequired: true,
          });
        }
      }
    } else {
      confirm({
        title: intl.get('schema.cancelOperation'),
        content: intl.get('schema.cancelPropmt'),
        okText: intl.get('common.yes'),
        cancelText: intl.get('common.no'),
        onOk: async () => {
          if (type === 'field') {
            const data = this.state.fieldList.filter(i => i.name !== '');
            if (data.length > 0) {
              this.handleDeleteField(data);
            } else {
              this.setState({
                fieldRequired: false,
              });
            }
          } else {
            this.handleDeleteTtl();
          }
          this.props.asyncUpdateEditStatus(false);
        },
      });
    }
  };

  handleDeleteTtl = async () => {
    const { match } = this.props;
    const {
      params: { edge },
    } = match;
    const res = await this.props.asyncAlterField({
      type: 'EDGE',
      name: edge,
      action: 'TTL',
      config: {
        ttl: {
          col: '',
        },
      },
    });
    if (res.code === 0) {
      message.success(intl.get('common.deleteSuccess'));
      this.getDetails();
    } else {
      message.warning(res.message);
    }
    trackEvent(
      'schema',
      'delete_edge_ttl',
      res.code === 0 ? 'ajax_success' : 'ajax_fail',
    );
  };

  renderFields = () => {
    const { editRow, fieldList, editField } = this.state;
    const columns = [
      {
        title: intl.get('common.propertyName'),
        dataIndex: 'name',
        align: 'center' as const,
        render: (record, _, index) => {
          if (editRow === index && editField!.alterType === 'ADD') {
            return (
              <Input
                value={editField!.name}
                onChange={e => this.handleChangeValue('name', e.target.value)}
                placeholder={intl.get('formRules.defaultRequired')}
              />
            );
          } else {
            return <span>{record}</span>;
          }
        },
      },
      {
        title: intl.get('common.dataType'),
        dataIndex: 'type',
        align: 'center' as const,
        render: (record, _, index) => {
          if (editRow === index) {
            return (
              <Select
                value={editField!.type}
                onChange={value => this.handleChangeValue('type', value)}
              >
                {dataType.map(item => {
                  return (
                    <Option value={item.value} key={item.value}>
                      {item.label}
                    </Option>
                  );
                })}
              </Select>
            );
          } else {
            return <span>{record}</span>;
          }
        },
      },
      {
        title: intl.get('common.defaults'),
        dataIndex: 'value',
        align: 'center' as const,
        render: (record, row, index) => {
          if (editRow === index) {
            return row.type === 'timestamp' ? (
              <Popover
                trigger="focus"
                placement="right"
                content={intl.getHTML('schema.timestampFormat')}
              >
                <Input
                  value={editField!.value}
                  onChange={e =>
                    this.handleChangeValue('value', e.target.value)
                  }
                  placeholder={intl.get('formRules.defaultRequired')}
                />
              </Popover>
            ) : (
              <Input
                value={editField!.value}
                onChange={e => this.handleChangeValue('value', e.target.value)}
                placeholder={intl.get('formRules.defaultRequired')}
              />
            );
          } else {
            return <span>{record}</span>;
          }
        },
      },
      {
        title: '',
        dataIndex: 'action',
        align: 'center' as const,
        width: 150,
        render: (_record, row, index) => {
          return (
            <div className="action">
              {editRow !== index ? (
                <>
                  <Button
                    type="link"
                    onClick={() => this.handleEditField(row, index)}
                    disabled={editRow !== null}
                  >
                    {intl.get('common.edit')}
                  </Button>
                  <Popconfirm
                    onConfirm={() => {
                      this.handleDeleteField([row]);
                    }}
                    title={intl.get('common.ask')}
                    okText={intl.get('common.ok')}
                    cancelText={intl.get('common.cancel')}
                  >
                    <Button type="link" disabled={editRow !== null}>
                      {intl.get('common.delete')}
                    </Button>
                  </Popconfirm>
                </>
              ) : (
                <>
                  <Button type="link" onClick={this.handleUpdateField}>
                    {intl.get('common.ok')}
                  </Button>
                  <Button type="link" onClick={this.handleCancelEdit}>
                    {intl.get('common.cancel')}
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ];
    return (
      <Table
        columns={columns}
        dataSource={fieldList}
        rowKey={(_, index) => index.toString()}
        pagination={false}
        footer={() => (
          <Button
            type="primary"
            onClick={this.handleAddField}
            disabled={editRow !== null}
          >
            {intl.get('common.addProperty')}
          </Button>
        )}
      />
    );
  };

  renderTtlConfig = () => {
    const innerItemLayout = {
      labelCol: {
        span: 8,
      },
      wrapperCol: {
        span: 9,
      },
    };
    const fields = this.state.fieldList;
    const ttlOptions = fields.filter(i =>
      ['int', 'int64', 'timestamp'].includes(i.type),
    );
    const { editTtl, ttlConfig, editTtlConfig } = this.state;
    return (
      <>
        <Col span={10}>
          <Form.Item label="TTL_COL" {...innerItemLayout}>
            {editTtl ? (
              <Select
                value={editTtlConfig!.col}
                onChange={value => this.handleChangeTtl('col', value)}
              >
                {ttlOptions.map(i => (
                  <Option value={i.name} key={i.name}>
                    {i.name}
                  </Option>
                ))}
              </Select>
            ) : (
              <span>{ttlConfig && ttlConfig.col}</span>
            )}
          </Form.Item>
        </Col>
        <Col span={10}>
          <Form.Item label="TTL_DURATION" {...innerItemLayout}>
            {editTtl ? (
              <Input
                value={editTtlConfig!.duration}
                onChange={e => this.handleChangeTtl('duration', e.target.value)}
                placeholder={intl.get('formRules.ttlDurationRequired')}
              />
            ) : (
              <span>{ttlConfig && ttlConfig.duration}</span>
            )}
          </Form.Item>
        </Col>
        <Col span={4}>
          {!editTtl ? (
            <>
              <Button type="link" onClick={this.handleEditTtl}>
                {intl.get('common.edit')}
              </Button>
              <Popconfirm
                onConfirm={() => {
                  this.handleDeleteTtl();
                }}
                title={intl.get('common.ask')}
                okText={intl.get('common.ok')}
                cancelText={intl.get('common.cancel')}
              >
                <Button type="link">{intl.get('common.delete')}</Button>
              </Popconfirm>
            </>
          ) : (
            <>
              <Button type="link" onClick={this.handleUpdateTtl}>
                {intl.get('common.ok')}
              </Button>
              <Button type="link" onClick={this.handleCancelEditTtl}>
                {intl.get('common.cancel')}
              </Button>
            </>
          )}
        </Col>
      </>
    );
  };

  getGql = () => {
    const { editField, editTtlConfig } = this.state;
    if (editField || editTtlConfig) {
      const { match } = this.props;
      const {
        params: { edge },
      } = match;
      const action = editField ? editField.alterType : 'TTL';
      const config = editField
        ? {
            fields: [editField],
          }
        : editTtlConfig
        ? {
            ttl: editTtlConfig,
          }
        : {};
      const gql = getAlterGQL({
        type: 'EDGE',
        name: edge,
        action,
        config,
      });
      return gql;
    } else {
      return '';
    }
  };

  goBack = e => {
    e.preventDefault();
    const { match, history } = this.props;
    const { editRow, editTtl } = this.state;
    const {
      params: { space },
    } = match;
    if (editRow !== null || editTtl) {
      confirm({
        title: intl.get('schema.leavePage'),
        content: intl.get('schema.leavePagePrompt'),
        okText: intl.get('common.confirm'),
        cancelText: intl.get('common.cancel'),
        onOk() {
          history.push(`/space/${space}/edge/list`);
          trackEvent('navigation', 'view_edge_list', 'from_edge_edit');
        },
      });
    } else {
      history.push(`/space/${space}/edge/list`);
      trackEvent('navigation', 'view_edge_list', 'from_edge_edit');
    }
  };

  render() {
    const { match } = this.props;
    const { fieldRequired, ttlRequired } = this.state;
    const {
      params: { edge },
    } = match;
    const outItemLayout = {
      labelCol: {
        span: 1,
      },
      wrapperCol: {
        span: 6,
      },
    };
    const currentGQL = this.getGql();
    return (
      <div className="space-config-component nebula-edge-edit">
        <header>
          <Breadcrumb className="breadcrumb-bold">
            <Breadcrumb.Item>{intl.get('common.edge')}</Breadcrumb.Item>
            <Breadcrumb.Item>
              <a href="#" onClick={this.goBack}>
                {intl.get('common.list')}
              </a>
            </Breadcrumb.Item>
            <Breadcrumb.Item>{intl.get('common.edit')}</Breadcrumb.Item>
          </Breadcrumb>
          <Button onClick={this.goBack}>
            <Icon type="left" />
            {intl.get('schema.backToEdgeList')}
          </Button>
        </header>
        <div className="edge-form">
          <Form>
            <Form.Item label={intl.get('common.name')} {...outItemLayout}>
              {edge}
            </Form.Item>
            <Collapse
              activeKey={fieldRequired ? ['field'] : []}
              expandIcon={() => {
                return <Checkbox checked={fieldRequired} />;
              }}
              onChange={e => {
                this.handleTogglePanels(e, 'field');
              }}
            >
              <Panel header={intl.get('schema.defineFields')} key="field">
                {fieldRequired && this.renderFields()}
              </Panel>
            </Collapse>
            <Collapse
              activeKey={ttlRequired ? ['ttl'] : []}
              expandIcon={() => {
                return <Checkbox checked={ttlRequired} />;
              }}
              onChange={e => {
                this.handleTogglePanels(e, 'ttl');
              }}
            >
              <Panel header={intl.get('schema.setTTL')} key="ttl">
                {ttlRequired && this.renderTtlConfig()}
              </Panel>
            </Collapse>
          </Form>
          <GQLCodeMirror currentGQL={currentGQL} />
        </div>
      </div>
    );
  }
}

export default withRouter(connect(mapState, mapDispatch)(EditEdge));