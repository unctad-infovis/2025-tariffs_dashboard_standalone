import React, {
  useState, useEffect, useRef, useCallback
} from 'react';
import '../styles/styles.less';

// https://www.npmjs.com/package/react-is-visible
import 'intersection-observer';
import { useIsVisible } from 'react-is-visible';

import Select from 'react-select';
import { Tooltip } from 'react-tooltip';

// Load helpers.
import ChartMap from './components/ChartMap.jsx';
import ChartSwarm from './components/ChartSwarm.jsx';

function App() {
  const appRef = useRef(null);
  const isVisibleApp = useIsVisible(appRef);

  const [data, setData] = useState(false);

  const [type, setType] = useState('pre');
  const [category, setCategory] = useState('total');
  const [country, setCountry] = useState(null);

  const [swarmState, setSwarmState] = useState('expanded');

  const fetchExternalData = () => {
    const dataPath = `${(window.location.href.includes('unctad.org')) ? 'https://storage.unctad.org/2025-tariffs_dashboard_standalone/' : (window.location.href.includes('localhost:80')) ? './' : 'https://unctad-infovis.github.io/2025-tariffs_dashboard_standalone/'}assets/data/`;

    const topology_file = 'worldmap-economies-54030.topo.json';
    const data_file = 'data.json';
    let values;
    try {
      values = Promise.all([
        fetch(dataPath + topology_file),
        fetch(dataPath + data_file),
      ]).then(results => Promise.all(results.map(result => result.json())));
    } catch (error) {
      console.error(error);
    }
    return values;
  };

  const checkWidth = useCallback(() => {
    if (appRef.current.offsetWidth < 600) {
      setTimeout(() => {
        setSwarmState('collapsed');
      }, 1500);
    }
  }, []);

  useEffect(() => {
    if (isVisibleApp === true) {
      checkWidth();
    }
  }, [checkWidth, isVisibleApp]);

  useEffect(() => {
    fetchExternalData().then((result) => setData(result));
  }, []);

  const changeType = (element) => {
    appRef.current.querySelectorAll('.selection_container.type_selection button').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    setType(element.value);
  };

  const changeCategory = (element) => {
    appRef.current.querySelectorAll('.selection_container.category_selection button').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    setCategory(element.value);
  };

  const changeCountry = (option) => {
    setCountry(option && (!Array.isArray(option) || option.length) ? option : null);
  };

  const customStyles = {
  // outer control (border, background)
    control: (provided, state) => ({
      ...provided,
      boxShadow: state.isFocused ? provided.boxShadow : null,
      height: 28,
      minHeight: 28 // control height
    }),
    // area that contains value & input
    valueContainer: (provided) => ({
      ...provided,
      height: 28,
      padding: '0 8px'
    }),
    // input itself (text cursor area)
    input: (provided) => ({
      ...provided,
      margin: 0,
      padding: 0
    }),
    // the selected value text (single)
    singleValue: (provided) => ({
      ...provided,
      marginTop: 17,
      transform: 'translateY(-50%)'
    }),
    // indicators on the right (chevron, clear)
    indicatorsContainer: (provided) => ({
      ...provided,
      height: 28
    }),
    // controls the dropdown option height/padding
    option: (provided) => ({
      ...provided,
      minHeight: 38,
      padding: '10px 12px'
    }),
  };
  return (
    <div className="app" ref={appRef}>
      <div className="title_container">
        <div className="text_container">
          <div className="main_title_container">
            <img src="https://static.dwcdn.net/custom/themes/unctad-2024-rebrand/Blue%20arrow.svg" className="logo" alt="UN Trade and Development logo" />
            <div className="title">
              <h3>How much have US tariffs really changed?</h3>
            </div>
          </div>
          <h4>Public discussions tend to focus on “reciprocal” tariffs, but they are only part of the story. Applied tariffs differ also because of older tariff rules, exemptions, and sectoral tariffs.</h4>
        </div>
        <div className="qr_code_container">
          <div className="text">
            Explore our
            {' '}
            <br />
            <strong>Tariff Tracker</strong>
          </div>
          <div className="qrcode"><img src="./assets/img/qrcode.png" alt="qrcode" /></div>
        </div>
      </div>
      <div className="visualizations_container">
        <div className="content">
          <div className="controls_container">
            <div className="control_container">
              <div className="label_container">
                <h4>
                  <span>1</span>
                  Select time frame
                </h4>
              </div>
              <div className="selection_container type_selection">
                <div className="selector_container">
                  <button type="button" className="active" value="pre" onClick={(event) => changeType(event.currentTarget)}>
                    <div className="title">Pre January 2025</div>
                  </button>
                </div>
                {/* <div className="selector_container">
                <button type="button" value="during" onClick={(event) => changeType(event.currentTarget)}>
                  <div className="title">June 2025</div>
                </button>
              </div> */}
                <div className="selector_container">
                  <button type="button" value="now" onClick={(event) => changeType(event.currentTarget)}>
                    <div className="title">Current tariffs</div>
                  </button>
                </div>
              </div>
            </div>
            <div className="control_container">
              <div className="label_container">
                <h4>
                  <span>2</span>
                  Select type of product
                </h4>
              </div>
              <div className="selection_container category_selection">
                <div className="selector_container">
                  <button type="button" className="active all" value="total" onClick={(event) => changeCategory(event.currentTarget)}>
                    <div className="title">ALL</div>
                  </button>
                </div>
                <div className="selector_container">
                  <button type="button" value="manufacturing" onClick={(event) => changeCategory(event.currentTarget)}>
                    <div className="title">Manufacturing</div>
                  </button>
                </div>
                <div className="selector_container">
                  <button type="button" value="agriculture" onClick={(event) => changeCategory(event.currentTarget)}>
                    <div className="title">Agriculture</div>
                  </button>
                </div>
                <div className="selector_container">
                  <button type="button" value="fuels_mining" onClick={(event) => changeCategory(event.currentTarget)}>
                    <div className="title">Fuels &amp; mining</div>
                  </button>
                </div>
              </div>
            </div>
            <div className="control_container">
              <div className="label_container">
                <h4>
                  <span>3</span>
                  Select economy
                </h4>
              </div>
              <div className="selection_container">
                <div className="selector_container">
                  {data
                && (
                <Select
                  className="basic-single"
                  classNamePrefix="select"
                  defaultValue=""
                  isClearable
                  isDisabled={false}
                  isLoading={false}
                  isRtl={false}
                  isSearchable
                  name="country"
                  onChange={(selectedOption) => changeCountry(selectedOption)}
                  options={data[1].slice().sort((a, b) => a.Country.localeCompare(b.Country)).map((el) => ({ value: el.Country, label: el.Country }))}
                  placeholder="Select economy "
                  styles={customStyles}
                  value={country}
                />
                )}
                </div>
              </div>
            </div>
          </div>
          <div className="legend_container">
            <div className="legend_item developed">Developed</div>
            <div className="legend_item developing">Developing</div>
            <div className="legend_item ldc">Least developed</div>
            <div className="legend_item selected">Selected country</div>
          </div>
          <div className="visualization_container">
            <div className="map_wrapper">
              <p>
                <strong>Mapping the size</strong>
                <br />
                Trade-weighted average
                {' '}
                <i className="circle_info" aria-hidden="true" data-tooltip-id="my-tooltip-1" title="">i</i>
              </p>
              {data !== false && (
                <ChartMap
                  category={category}
                  country={country}
                  swarm_collapsed={swarmState}
                  setCountry={setCountry}
                  type={type}
                  values={data}
                />
              )}
            </div>
            {data !== false && (
              <div className={`swarm_wrapper ${swarmState}`}>
                <div className="swarm_controls_container">
                  {swarmState !== 'full' && appRef.current.offsetWidth < 900 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSwarmState(prev => {
                        if (prev === 'collapsed') return 'expanded';
                        if (prev === 'expanded') return 'collapsed';
                        if (prev === 'full') return 'expanded';
                        return prev;
                      });
                    }}
                  >
                    {swarmState === 'collapsed' ? '◀◀' : '▶▶'}
                  </button>
                  )}
                  {' '}
                  {appRef.current.offsetWidth > 900 && false && (
                  <button
                    type="button"
                    onClick={() => {
                      setSwarmState(prev => {
                        if (prev === 'full') return 'expanded';
                        if (prev === 'expanded') return 'full';
                        return prev;
                      });
                    }}
                  >
                    {swarmState === 'full' ? '▶▶' : '⛶'}
                  </button>
                  )}
                </div>
                <p>
                  <strong>Mapping the difference</strong>
                  <br />
                  Trade-weighted average
                  {' '}
                  <i className="circle_info" aria-hidden="true" data-tooltip-id="my-tooltip-1" title="">i</i>
                </p>
                <ChartSwarm
                  category={category}
                  country={country}
                  setCountry={setCountry}
                  swarm_collapsed={swarmState}
                  type={type}
                  values={data}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <Tooltip
        className="my_tooltip"
        id="my-tooltip-1"
        place="top"
        content="The trade-weighted average tariff rate applied to each economy is based on the composition of exports to the US in 2024."
      />
      <Tooltip
        className="my_tooltip"
        id="my-tooltip-2"
        place="top"
      >
        <>
          <em>Source:</em>
          {' '}
          UN Trade and Development (UNCTAD) based on USITC and US presidential actions, including the Executive Orders published by the White House.
          <br />
          <em>Note:</em>
          {' '}
          Trade weights are for the year 2024. Tariffs are calculated at the HS 8-digit level. Agriculture includes agricultural raw materials and food. Fuels and mining include fuels, ores, metals, precious stones and non-monetary gold. The analysis excludes Section 232 steel and aluminum tariffs on derivatives under HS chapters 1-70, where the additional duty applies only to the metal content which is expected to be low. Tariffs for Belarus, Cuba, North Korea, and the Russian Federation are not presented, as separate schedules apply. Special industrial zones were not considered in tariff calculations. Data updated as of 12 September 2025.
          {' '}
          <a href="https://unctad.org/page/map-disclaimer" target="_blank" rel="noreferrer">Map disclaimer</a>
          .
        </>
      </Tooltip>
    </div>
  );
}

export default App;
